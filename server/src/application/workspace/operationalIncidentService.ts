import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import type { IncidentInput } from "../../../../shared/serviceOperations.js";
import { getOperationalForecast } from "./operationalForecastService.js";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const suggestions: Record<IncidentInput["kind"], string[]> = {
  delivery_delay: ["Confirmer la nouvelle date dans la commande fournisseur.", "Revoir les préparations prévues avant la réception ; envisager une alternative disponible."],
  unavailable: ["Vérifier les quantités restantes et les alternatives de la carte.", "Modifier la carte ou la commande après revue du chef."],
  lot_discarded: ["Déclarer la perte sur le lot dans Stocks ; ce signalement seul ne retire aucune quantité.", "Revoir les portions réalisables après la déclaration de perte."],
  stockout: ["Déclarer les demandes non servies sur la recette.", "Proposer un autre plat disponible puis consigner les substitutions réellement acceptées."],
  substitution: ["Enregistrer dans la fiche du service la recette demandée et celle réellement servie.", "Attribuer la vente à l'article effectivement servi, sans double production."],
  demand_change: ["Revoir le plan de préparation et justifier les compléments.", "Comparer en clôture les demandes, portions préparées et ventes enregistrées."],
};
export async function listOperationalIncidents(restaurantId: string, from: string, to: string) {
  const rows = await prisma.operationalIncident.findMany({ where: { restaurantId, serviceDate: {
    gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } }, orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }], take: 200 });
  const products = await prisma.product.findMany({ where: { restaurantId, id: { in: rows.flatMap(r => r.productId ? [r.productId] : []) } } });
  const lots = await prisma.stockLot.findMany({ where: { restaurantId, id: { in: rows.flatMap(r => r.lotId ? [r.lotId] : []) } } });
  const horizon = today(), end = iso(new Date(Date.parse(horizon) + 7 * 86400000));
  const forecast = rows.length ? await getOperationalForecast(restaurantId, horizon, end) : null;
  return rows.map(row => {
    const product = products.find(p => p.id === row.productId), lot = lots.find(l => l.id === row.lotId);
    const need = forecast?.ingredientNeeds.find(n => n.productId === row.productId);
    const consequences = ["Signalement uniquement : aucun stock, achat ou production n'est modifié."];
    if (product) consequences.push(`${product.name} : stock théorique enregistré ${Number(product.currentStock)} ${product.unit}.`);
    if (lot) consequences.push(`Lot concerné : ${Number(lot.remainingQuantity)} encore enregistrés ; échéance ${lot.expiresAt ? iso(lot.expiresAt) : "inconnue"}.`);
    if (need) consequences.push(`Besoin estimé du ${horizon} au ${end} : ${need.quantity} ${need.unit}. ${forecast?.blockers.length ? "Projection partielle, des services restent à compléter." : "À revoir avec les réceptions attendues."}`);
    if (forecast?.blockers.length) consequences.push("Conséquence chiffrée incomplète : consultez les prévisions pour les cartes, services ou historiques manquants.");
    return { ...row, serviceDate: iso(row.serviceDate), quantity: row.quantity === null ? null : Number(row.quantity),
      createdAt: row.createdAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null,
      consequences, suggestions: suggestions[row.kind as IncidentInput["kind"]] };
  });
}
export async function recordOperationalIncident(restaurantId: string, actorId: string, input: IncidentInput) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.operationalIncident.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    if (prior) {
      const decision = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId, decision: "incident_reported" } });
      if (!isDeepStrictEqual(decision?.snapshot, input)) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Ce signalement a déjà été enregistré avec d'autres valeurs.");
      return;
    }
    const product = input.productId ? await tx.product.findFirst({ where: { restaurantId, id: input.productId } }) : null;
    const lot = input.lotId ? await tx.stockLot.findFirst({ where: { restaurantId, id: input.lotId } }) : null;
    const orderLine = input.orderLineId ? await tx.purchaseOrderLine.findFirst({ where: { restaurantId, id: input.orderLineId } }) : null;
    const recipe = input.recipeId ? await tx.recipe.findFirst({ where: { restaurantId, id: input.recipeId } }) : null;
    if (input.productId && !product || input.lotId && !lot || input.orderLineId && !orderLine || input.recipeId && !recipe)
      throw new WorkspaceError(400, "INVALID_INCIDENT_REFERENCE", "Une référence n'appartient pas à votre restaurant.");
    if (lot && product?.id !== lot.productId || orderLine && product && orderLine.productId !== product.id)
      throw new WorkspaceError(400, "INCIDENT_PRODUCT_MISMATCH", "Le lot ou la commande ne correspond pas au produit.");
    if (input.quantity !== null && (!input.unit || product && input.unit !== product.unit || !product && input.unit !== "portion"))
      throw new WorkspaceError(400, "INVALID_INCIDENT_UNIT", "Renseignez l'unité du produit ou des portions.");
    if (input.kind === "lot_discarded" && !lot || input.kind === "delivery_delay" && !orderLine || input.kind === "substitution" && !recipe)
      throw new WorkspaceError(400, "INCIDENT_REFERENCE_REQUIRED", "Ce type de signalement nécessite son lot, sa ligne de commande ou sa recette.");
    await tx.operationalIncident.create({ data: { ...input, restaurantId, createdBy: actorId, serviceDate: new Date(`${input.serviceDate}T00:00:00Z`) } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "incident_reported", snapshot: input as unknown as Prisma.InputJsonValue } });
  });
  return (await listOperationalIncidents(restaurantId, input.serviceDate, input.serviceDate)).find(r => r.operationId === input.operationId)!;
}
export async function resolveOperationalIncident(restaurantId: string, actorId: string, id: string,
  input: { operationId: string; expectedRevision: number; actionNote: string }) {
  const day = await prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const incident = await tx.operationalIncident.findFirst({ where: { restaurantId, id } });
    if (!incident) throw new WorkspaceError(404, "NOT_FOUND", "Signalement introuvable.");
    const prior = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId, decision: "incident_resolved" } });
    if (prior) {
      if (!isDeepStrictEqual(prior.snapshot, { id, ...input })) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée.");
      return iso(incident.serviceDate);
    }
    if (incident.revision !== input.expectedRevision || incident.status !== "open") throw new WorkspaceError(409, "REVISION_CONFLICT", "Le signalement a changé. Rechargez-le.");
    await tx.operationalIncident.update({ where: { id }, data: { status: "resolved", revision: { increment: 1 },
      resolvedBy: actorId, resolvedAt: new Date(), actionNote: input.actionNote } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "incident_resolved", snapshot: { id, ...input } } });
    return iso(incident.serviceDate);
  });
  return (await listOperationalIncidents(restaurantId, day, day)).find(r => r.id === id)!;
}
