import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type WorkspaceMode } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { getSalesBaseline } from "./salesBaselineService.js";

type PurchaseDatabase = PrismaClient | Prisma.TransactionClient;
type Baseline = Awaited<ReturnType<typeof getSalesBaseline>>;

export interface PurchaseSuggestion {
  suggestionKey: string;
  productId: string;
  productName: string;
  supplierName: string;
  unit: string;
  status: "ready" | "needs_stock_count" | "covered" | "unit_mismatch";
  canAdd: boolean;
  forecastNeed: number;
  countedStock: number | null;
  countDate: string | null;
  estimatedQuantity: number | null;
  currentUnitPrice: number;
  estimatedCost: number | null;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
  reason: string;
  decision: { kind: "added" | "excluded"; operationId: string; quantity: number | null; orderId: string | null } | null;
}

export interface PurchaseSuggestions {
  status: "ready" | "no_data" | "insufficient_history" | "simulation_only";
  provenance: "recorded_sales" | "demo_simulation" | "mixed";
  workspaceMode: WorkspaceMode;
  model: string;
  asOfDate: string;
  forecastDate: string;
  completeServiceDays: number;
  blockers: string[];
  suggestions: PurchaseSuggestion[];
  assumptions: string[];
}

interface AggregatedNeed {
  productId: string;
  productName: string;
  unit: string;
  forecastNeed: number;
  sources: PurchaseSuggestion["sources"];
}

const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

function suggestionFor(need: AggregatedNeed, product: {
  id: string; name: string; unit: string; stockRevision: number; currentStock: Prisma.Decimal;
  pricePerUnit: Prisma.Decimal; supplier: { name: string };
}, count: { countedQuantity: Prisma.Decimal; countDate: Date; stockRevisionAfter: number; unit: string } | undefined,
workspaceMode: WorkspaceMode, baseline: Baseline, canUseProvenance: boolean, projectionComplete: boolean): PurchaseSuggestion {
  const unitMatches = need.unit === product.unit;
  const countVerified = !!count && count.stockRevisionAfter === product.stockRevision && count.unit === product.unit;
  const countedStock = countVerified ? Number(count!.countedQuantity) : null;
  const estimatedQuantity = !unitMatches || !countVerified ? null : roundQuantity(Math.max(0, need.forecastNeed - countedStock!));
  const status = !unitMatches ? "unit_mismatch" : !countVerified ? "needs_stock_count"
    : estimatedQuantity === 0 ? "covered" : "ready";
  const sourceEligible = canUseProvenance && workspaceMode === "operational" || workspaceMode === "demo";
  const canAdd = status === "ready" && sourceEligible && projectionComplete;
  const input = {
    productId: product.id, forecastNeed: roundQuantity(need.forecastNeed), countedStock,
    countDate: countVerified ? count!.countDate.toISOString().slice(0, 10) : null,
    stockRevision: product.stockRevision, unit: product.unit, unitMatches,
    baselineModel: baseline.model, asOfDate: baseline.asOfDate, forecastDate: baseline.forecastDate,
    workspaceMode, provenance: baseline.provenance,
    sources: need.sources,
  };
  const suggestionKey = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const reason = !unitMatches ? "L’unité de la recette ne correspond plus à l’unité du produit."
    : !countVerified ? "Faites un comptage à jour avant de calculer ce qui reste à acheter."
    : !sourceEligible ? "Cette projection simulée ne peut pas devenir un achat de l’espace réel."
    : !projectionComplete ? "Une vente de la période n’est pas reliée à une recette exploitable : besoin incomplet."
    : status === "covered" ? "Le dernier comptage couvre le besoin prévu pour le prochain service."
    : "Besoin prévu pour le prochain service, diminué du dernier stock compté.";
  return { suggestionKey, productId: product.id, productName: product.name, supplierName: product.supplier.name,
    unit: product.unit, status, canAdd, forecastNeed: roundQuantity(need.forecastNeed), countedStock,
    countDate: countVerified ? count!.countDate.toISOString().slice(0, 10) : null,
    estimatedQuantity, currentUnitPrice: Number(product.pricePerUnit),
    estimatedCost: estimatedQuantity === null ? null : roundQuantity(estimatedQuantity * Number(product.pricePerUnit)),
    sources: need.sources, reason, decision: null };
}

function summarizeNeeds(baseline: Baseline, products: Array<{ id: string; name: string; unit: string }>) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const needs = new Map<string, AggregatedNeed>();
  const blockers: string[] = [];
  for (const item of baseline.items) {
    const projection = item.recipeProjection;
    if (projection.status !== "mapped") {
      blockers.push(`${item.saleItemName} : ${projection.reason}`);
      continue;
    }
    for (const ingredient of projection.ingredients) {
      const product = productById.get(ingredient.productId);
      if (!product) {
        blockers.push(`${ingredient.productName} : produit absent du catalogue.`);
        continue;
      }
      const existing = needs.get(ingredient.productId);
      if (existing && existing.unit !== ingredient.unit) {
        blockers.push(`${ingredient.productName} : unités différentes entre les recettes utilisées.`);
        continue;
      }
      const source = { saleItemName: item.saleItemName, recipeName: projection.recipeName,
        recipeVersion: projection.recipeVersion, quantity: roundQuantity(ingredient.quantity) };
      needs.set(ingredient.productId, {
        productId: ingredient.productId, productName: ingredient.productName, unit: ingredient.unit,
        forecastNeed: (existing?.forecastNeed ?? 0) + ingredient.quantity,
        sources: [...(existing?.sources ?? []), source],
      });
    }
  }
  return { needs: [...needs.values()], blockers };
}

export async function getPurchaseSuggestions(restaurantId: string, db: PurchaseDatabase = prisma): Promise<PurchaseSuggestions> {
  const [baseline, restaurant, products, counts] = await Promise.all([
    getSalesBaseline(restaurantId, undefined, db),
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
    db.product.findMany({ where: { restaurantId }, include: { supplier: { select: { name: true } } }, orderBy: { name: "asc" } }),
    db.stockCount.findMany({ where: { restaurantId }, orderBy: [{ countedAt: "desc" }, { id: "desc" }],
      select: { productId: true, countedQuantity: true, countDate: true, stockRevisionAfter: true, unit: true } }),
  ]);
  if (!restaurant) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
  const workspaceMode = restaurant.mode;
  const status: PurchaseSuggestions["status"] = baseline.status === "no_data" ? "no_data" : baseline.status !== "experimental"
    ? "insufficient_history" : baseline.provenance === "demo_simulation" && workspaceMode !== "demo"
      ? "simulation_only" : "ready";
  if (status !== "ready") return { status, provenance: baseline.provenance, workspaceMode,
    model: baseline.model, asOfDate: baseline.asOfDate, forecastDate: baseline.forecastDate,
    completeServiceDays: baseline.completeServiceDays, blockers: baseline.incompleteDates.map((date) => `Service du ${date} incomplet.`),
    suggestions: [], assumptions: ["Une suggestion de démonstration ne peut pas être validée comme achat dans un espace réel."] };

  const { needs, blockers } = summarizeNeeds(baseline, products);
  const latestCount = new Map<string, (typeof counts)[number]>();
  for (const count of counts) if (!latestCount.has(count.productId)) latestCount.set(count.productId, count);
  const productById = new Map(products.map((product) => [product.id, product]));
  const canUseProvenance = baseline.provenance === "recorded_sales";
  const suggestions = needs.flatMap((need) => {
    const product = productById.get(need.productId);
    return product ? [suggestionFor(need, product, latestCount.get(need.productId), workspaceMode,
      baseline, canUseProvenance, blockers.length === 0)] : [];
  });
  const decisionRows = await db.recommendationDecision.findMany({
    where: { restaurantId, decision: { in: ["purchase_suggestion_added", "purchase_suggestion_excluded"] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { purchaseOrderLine: { select: { orderId: true } } },
  });
  const decisionsBySuggestion = new Map<string, PurchaseSuggestion["decision"]>();
  for (const row of decisionRows) {
    const snapshot = row.snapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
        typeof snapshot.productId !== "string" || typeof snapshot.suggestionKey !== "string") continue;
    const key = `${snapshot.productId}\u0000${snapshot.suggestionKey}`;
    if (decisionsBySuggestion.has(key)) continue;
    decisionsBySuggestion.set(key, {
      kind: row.decision === "purchase_suggestion_added" ? "added" : "excluded",
      operationId: row.operationId,
      quantity: typeof snapshot.quantity === "number" ? snapshot.quantity : null,
      orderId: row.purchaseOrderLine?.orderId ?? null,
    });
  }
  return { status: "ready", provenance: workspaceMode === "demo" ? "demo_simulation" : baseline.provenance,
    workspaceMode, model: baseline.model, asOfDate: baseline.asOfDate, forecastDate: baseline.forecastDate,
    completeServiceDays: baseline.completeServiceDays, blockers,
    suggestions: suggestions.map((suggestion) => ({ ...suggestion, decision: decisionsBySuggestion.get(
      `${suggestion.productId}\u0000${suggestion.suggestionKey}`) ?? null })),
    assumptions: ["Calcul du prochain service uniquement : aucun délai fournisseur n’est renseigné.",
      "Les commandes non réceptionnées ne sont pas déduites du besoin.",
      "Le prix utilise le catalogue actuel, à titre indicatif; ce n’est pas un prix historique ni un montant comptable."] };
}

export async function recordPurchaseSuggestionDecision(restaurantId: string, actorId: string, input: {
  operationId: string; productId: string; suggestionKey: string; decision: "added" | "excluded"; quantity?: number;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId } });
    if (prior) {
      const priorSnapshot = prior.snapshot;
      if (prior.decision !== `purchase_suggestion_${input.decision}` || !priorSnapshot || typeof priorSnapshot !== "object" ||
          Array.isArray(priorSnapshot) || priorSnapshot.suggestionKey !== input.suggestionKey ||
          priorSnapshot.productId !== input.productId || (priorSnapshot.quantity ?? null) !== (input.quantity ?? null)) {
        throw new WorkspaceError(409, "SUGGESTION_OPERATION_CONFLICT", "Cette décision a déjà été enregistrée avec d’autres valeurs.");
      }
      return { id: prior.id, operationId: prior.operationId, decision: prior.decision, replayed: true };
    }
    const snapshot = await getPurchaseSuggestions(restaurantId, tx);
    const suggestion = snapshot.suggestions.find((candidate) => candidate.productId === input.productId);
    if (!suggestion || suggestion.suggestionKey !== input.suggestionKey)
      throw new WorkspaceError(409, "SUGGESTION_CHANGED", "Le besoin ou le stock a changé. Rechargez la proposition avant de décider.");
    if (input.decision === "added" && (!suggestion.canAdd || input.quantity === undefined || input.quantity <= 0))
      throw new WorkspaceError(409, "SUGGESTION_NOT_ACTIONABLE", suggestion.reason);
    if (input.decision === "excluded" && input.quantity !== undefined)
      throw new WorkspaceError(400, "INVALID_SUGGESTION_DECISION", "Une proposition écartée ne reçoit pas de quantité.");
    const decisionSnapshot = JSON.parse(JSON.stringify({ suggestionKey: suggestion.suggestionKey, productId: suggestion.productId,
      quantity: input.quantity ?? null, suggestion, provenance: snapshot.provenance,
      workspaceMode: snapshot.workspaceMode, model: snapshot.model, asOfDate: snapshot.asOfDate,
      forecastDate: snapshot.forecastDate })) as Prisma.InputJsonValue;
    const decision = await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: `purchase_suggestion_${input.decision}`,
      snapshot: decisionSnapshot } });
    return { id: decision.id, operationId: decision.operationId, decision: decision.decision, replayed: false };
  });
}
