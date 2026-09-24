import { prisma } from "../../infrastructure/database/prisma.js";
import { isSimulationStockMovement } from "./stockMovementProvenance.js";

export interface OperationalReportRow {
  section: string; date: string; metric: string; value: string | number; source: string;
}

export interface DeclaredLossSummary {
  method: string; dateBasis: string; reportedMovementCount: number; unpricedMovementCount: number;
  incompatibleUnitMovementCount: number; excludedSimulationMovementCount: number;
  unavailableMetrics: ["stockouts", "unsold_quantity"];
}

export async function getOperationalReport(restaurantId: string, from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
  const [workspace, sales, movements, productions, orders] = await prisma.$transaction([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
    prisma.dailySale.findMany({ where: { restaurantId, serviceDate: { gte: start, lt: end } }, include: {
      saleItem: { select: { name: true } }, serviceDay: { select: { source: true } },
    }, orderBy: { serviceDate: "asc" } }),
    prisma.stockMovement.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, include: {
      product: { select: { name: true, unit: true } },
      purchaseReceiptLine: { select: { receipt: { select: { simulated: true } } } },
    }, orderBy: { createdAt: "asc" } }),
    prisma.production.findMany({ where: { restaurantId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, include: { lines: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const rows: OperationalReportRow[] = [];
  const declaredLosses: DeclaredLossSummary = {
    method: "Mouvements de stock négatifs explicitement étiquetés « loss » ; quantité = valeur absolue du delta. Coût = quantité × prix unitaire snapshoté uniquement. Aucune inférence depuis les ventes, productions ou seuils.",
    dateBasis: "Date d’enregistrement du mouvement (createdAt UTC) ; bornes de période incluses.",
    reportedMovementCount: 0, unpricedMovementCount: 0, incompatibleUnitMovementCount: 0,
    excludedSimulationMovementCount: 0, unavailableMetrics: ["stockouts", "unsold_quantity"],
  };

  for (const movement of movements) {
    const explicitLoss = movement.delta.isNegative() && ["loss", "simulation_loss"].includes(movement.reason);
    const simulated = isSimulationStockMovement(movement, workspace?.mode ?? "operational");
    if (explicitLoss && simulated) declaredLosses.excludedSimulationMovementCount++;
    if (workspace?.mode === "demo" || simulated) continue;

    if (explicitLoss) {
      if (movement.reason !== "loss") continue;
      const unit = movement.productUnitSnapshot ?? movement.product.unit;
      const quantity = movement.delta.abs();
      const operation = `Opération source ${movement.operationId}`;
      if (unit !== movement.product.unit) {
        declaredLosses.incompatibleUnitMovementCount++;
        rows.push({ section: "Pertes à vérifier", date: movement.createdAt.toISOString(),
          metric: `${movement.productNameSnapshot ?? movement.product.name} — unité enregistrée ${unit}, unité actuelle ${movement.product.unit}`,
          value: Number(quantity), source: `${operation} · exclue du total des pertes tant que l’unité n’est pas rapprochée` });
        continue;
      }

      declaredLosses.reportedMovementCount++;
      const knownCost = movement.unitPriceSnapshot?.mul(quantity).toDecimalPlaces(2);
      if (knownCost === undefined || knownCost === null) declaredLosses.unpricedMovementCount++;
      const productName = movement.productNameSnapshot ?? movement.product.name;
      rows.push({ section: "Pertes déclarées", date: movement.createdAt.toISOString(),
        metric: `${productName} — quantité perdue (${unit})`, value: Number(quantity), source: operation });
      rows.push({ section: "Pertes déclarées", date: movement.createdAt.toISOString(),
        metric: `${productName} — coût connu valorisé au prix snapshoté (EUR)`,
        value: knownCost?.toFixed(2) ?? "Non valorisé", source: knownCost ? operation : `${operation} · prix snapshoté absent` });
      continue;
    }

    rows.push({ section: "Mouvements de stock", date: movement.createdAt.toISOString(),
      metric: `${movement.productNameSnapshot ?? movement.product.name} — ${movement.reason} (${movement.productUnitSnapshot ?? movement.product.unit})`,
      value: Number(movement.delta), source: movement.invoiceDocumentId ? "Pièce validée" : "Opération enregistrée" });
  }

  if (workspace?.mode !== "demo") {
    for (const item of sales) if (item.source !== "demo_simulation" && item.serviceDay.source !== "demo_simulation")
      rows.push({ section: "Ventes enregistrées", date: item.serviceDate.toISOString().slice(0, 10),
        metric: `${item.saleItem.name} — unités vendues`, value: item.quantity,
        source: item.source === "csv" ? item.revision ? "Import CSV corrigé" : "Import CSV" :
          item.source === "pos" ? item.revision ? "Caisse POS corrigée" : "Caisse POS" :
            item.source === "ticket_z" ? "Ticket Z vérifié" : "Saisie manuelle" });
    for (const item of productions) if (item.actorId !== "restaurant-simulation:v1")
      rows.push({ section: "Productions et refus", date: item.date.toISOString().slice(0, 10),
        metric: `${item.recipeName} — ${item.kind}`, value: item.portions,
        source: "Déclaration enregistrée — portions" });
    for (const order of orders) if (!order.status.startsWith("simulated")) for (const line of order.lines)
      rows.push({ section: "Commandes validées", date: order.createdAt.toISOString(),
        metric: `${line.productName} — ${line.quantity} ${line.unit}`,
        value: Number(line.quantity.mul(line.pricePerUnit)), source: "Commande validée à transmettre — valeur indicative EUR" });
  }

  return { from, to, timezone: "UTC", generatedAt: new Date().toISOString(), declaredLosses, rows };
}
