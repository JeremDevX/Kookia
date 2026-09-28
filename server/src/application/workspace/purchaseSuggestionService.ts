import { purchaseAvailability } from "./purchaseAvailability.js";
import type { ForecastIngredient } from "../../../../shared/operationalForecast.js";
import { getOperationalForecast } from "./operationalForecastService.js";
import { addCalendarDays, supplierDeliveryHorizon, type SupplierDeliveryHorizon } from "../../../../shared/supplierDelivery.js";
import { getOrderStep, roundOrderQuantity, isOrderQuantity, orderStepLabel } from "../../../../shared/orderQuantity.js";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type WorkspaceMode } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { getSalesBaseline } from "./salesBaselineService.js";
import { forecastWeatherNotice, type ForecastWeatherReference } from "../../../../shared/forecastWeather.js";

type PurchaseDatabase = PrismaClient | Prisma.TransactionClient;
type Baseline = { model: string; asOfDate: string; forecastDate: string; provenance: PurchaseSuggestions["provenance"] };

export interface PurchaseSuggestion {
  suggestionKey: string;
  productId: string;
  productName: string;
  supplierName: string;
  unit: string;
  status: "ready" | "needs_stock_count" | "covered" | "unit_mismatch" | "supplier_constraints_missing" | "availability_conflict";
  canAdd: boolean;
  deliveryHorizon: SupplierDeliveryHorizon;
  usableStock: number | null;
  expiredQuantity: number;
  unknownExpiryQuantity: number;
  beforeDeliveryShortage: number;
  shortages: Array<{ date: string; slot?: "lunch" | "dinner"; quantity: number }>;
  expectedQuantity: number;
  conditionalNetNeed: number | null;
  forecastNeed: number;
  countedStock: number | null;
  countDate: string | null;
  netNeed: number | null;
  orderStep: number;
  estimatedQuantity: number | null;
  currentUnitPrice: number;
  estimatedCost: number | null;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
  weatherAdjustments: ForecastWeatherReference[];
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

const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

function suggestionFor(need: ForecastIngredient & { forecastNeed: number }, product: {
  id: string; name: string; category: string; unit: string; stockRevision: number; currentStock: Prisma.Decimal;
  pricePerUnit: Prisma.Decimal; orderPackQuantity?: Prisma.Decimal | null; supplier: { name: string; deliveryWeekdays: number[]; leadTimeDays: number | null; orderCutoffTime: string | null };
}, count: { countedQuantity: Prisma.Decimal; countDate: Date; stockRevisionAfter: number; unit: string } | undefined,
workspaceMode: WorkspaceMode, baseline: Baseline, canUseProvenance: boolean, projectionComplete: boolean, now: Date, expectedQuantity: number, availability: ReturnType<typeof purchaseAvailability> | null, weatherAdjustments: ForecastWeatherReference[]): PurchaseSuggestion {
  const deliveryHorizon = supplierDeliveryHorizon(product.supplier, now);
  const packKnown = product.orderPackQuantity !== null && product.orderPackQuantity !== undefined;
  const constraintsKnown = deliveryHorizon.status === "known" && packKnown;
  const unitMatches = need.unit === product.unit;
  const countVerified = !!count && count.stockRevisionAfter === product.stockRevision && count.unit === product.unit;
  const countedStock = countVerified ? Number(count!.countedQuantity) : null;
  const orderStep = getOrderStep(product);
  const netNeed = !unitMatches || !countVerified ? null : availability!.netNeed;
  const conditionalNetNeed = netNeed === null ? null : availability!.conditionalNetNeed;
  const estimatedQuantity = !constraintsKnown || conditionalNetNeed === null ? null : roundOrderQuantity(availability!.purchasableNeed, orderStep);
  const status = !constraintsKnown ? "supplier_constraints_missing" : !unitMatches ? "unit_mismatch" : !countVerified ? "needs_stock_count"
    : availability?.lotMismatch || (availability?.beforeDeliveryShortage ?? 0) > 0 ? "availability_conflict"
    : estimatedQuantity === 0 ? "covered" : "ready";
  const sourceEligible = canUseProvenance && workspaceMode === "operational" || workspaceMode === "demo";
  const canAdd = status === "ready" && sourceEligible && projectionComplete;
  const input = {
    deliveryHorizon, expectedQuantity, availability, orderPackQuantity: product.orderPackQuantity?.toString() ?? null,
    productId: product.id, forecastNeed: roundQuantity(need.forecastNeed), countedStock,
    countDate: countVerified ? count!.countDate.toISOString().slice(0, 10) : null,
    orderStep, stockRevision: product.stockRevision, unit: product.unit, unitMatches,
    baselineModel: baseline.model, asOfDate: baseline.asOfDate, forecastDate: baseline.forecastDate,
    workspaceMode, provenance: baseline.provenance,
    sources: need.sources, weatherAdjustments,
  };
  const suggestionKey = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const reason = !constraintsKnown ? "Renseignez les contraintes de livraison et le conditionnement réel avant de valider une suggestion." : !unitMatches ? "L’unité de la recette ne correspond plus à l’unité du produit."
    : !countVerified ? "Faites un comptage à jour avant de calculer ce qui reste à acheter."
    : availability?.lotMismatch ? "Les lots dépassent le dernier comptage : rapprochez les quantités avant de commander."
    : (availability?.beforeDeliveryShortage ?? 0) > 0 ? `Manque estimé de ${availability!.beforeDeliveryShortage} ${product.unit} avant la prochaine livraison. Le colis proposé ne résout que les besoins ultérieurs : confirmez une livraison avancée ou une alternative avec le chef.`
    : !sourceEligible ? "Cette projection simulée ne peut pas devenir un achat de l’espace réel."
    : !projectionComplete ? "Une vente de la période n’est pas reliée à une recette exploitable : besoin incomplet."
    : status === "covered" ? expectedQuantity > 0 ? "Le besoin serait couvert sous réserve de réception des commandes attendues; elles ne sont pas du stock." : "Le dernier comptage couvre le besoin prévu."
    : `Besoin estimé jusqu’au ${deliveryHorizon.status === "known" ? deliveryHorizon.throughDate : baseline.forecastDate}, stock compté déduit${expectedQuantity > 0 ? ", sous réserve des commandes attendues" : ""}.`;
  return { suggestionKey, productId: product.id, productName: product.name, supplierName: product.supplier.name,
    unit: product.unit, status, canAdd, deliveryHorizon, expectedQuantity,
    usableStock: countVerified ? availability!.usableStock : null, expiredQuantity: availability?.expiredQuantity ?? 0,
    unknownExpiryQuantity: availability?.unknownExpiryQuantity ?? 0, beforeDeliveryShortage: availability?.beforeDeliveryShortage ?? 0, shortages: availability?.shortages ?? [],
    conditionalNetNeed, forecastNeed: roundQuantity(need.forecastNeed), countedStock,
    countDate: countVerified ? count!.countDate.toISOString().slice(0, 10) : null,
    netNeed, orderStep, estimatedQuantity, currentUnitPrice: Number(product.pricePerUnit),
    estimatedCost: estimatedQuantity === null ? null : roundQuantity(estimatedQuantity * Number(product.pricePerUnit)),
    sources: need.sources, weatherAdjustments, reason, decision: null };
}

export async function getPurchaseSuggestions(restaurantId: string, db: PurchaseDatabase = prisma, inputDate = new Date()): Promise<PurchaseSuggestions> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(inputDate);
  const [baseline, restaurant, products, counts, pendingLines, lots] = await Promise.all([
    getSalesBaseline(restaurantId, addCalendarDays(today, -1), db),
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
    db.product.findMany({ where: { restaurantId }, include: { supplier: true }, orderBy: { name: "asc" } }),
    db.stockCount.findMany({ where: { restaurantId }, orderBy: [{ countedAt: "desc" }, { id: "desc" }],
      select: { productId: true, countedQuantity: true, countDate: true, stockRevisionAfter: true, unit: true } }),
    db.purchaseOrderLine.findMany({ where: { restaurantId, order: { status: { in: ["validated", "partially_received"] } } }, include: { receiptLines: { select: { receivedQuantity: true } } } }),
    db.stockLot.findMany({ where: { restaurantId, remainingQuantity: { gt: 0 } }, select: { productId: true, remainingQuantity: true, expiresAt: true } }),
  ]);
  if (!restaurant) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
  const workspaceMode = restaurant.mode;
  const context = { ...baseline, model: "qualified_service_menu_v1", asOfDate: addCalendarDays(today, -1), forecastDate: today,
    provenance: workspaceMode === "demo" ? "demo_simulation" as const : "recorded_sales" as const };
  const latestCount = new Map<string, (typeof counts)[number]>();
  for (const count of counts) if (!latestCount.has(count.productId)) latestCount.set(count.productId, count);
  const expectedLines = pendingLines.map((line) => ({ productId: line.productId, unit: line.unit, quantity: Number(line.quantity),
    receivedQuantity: line.receiptLines.reduce((sum, receipt) => sum + Number(receipt.receivedQuantity), 0),
    expectedDeliveryDate: line.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null }));
  const horizons = new Map(products.map((product) => [product.supplierId, supplierDeliveryHorizon(product.supplier, inputDate)]));
  const throughDates = [...new Set([...horizons.values()].map((horizon) => horizon.status === "known" ? horizon.throughDate : today))];
  const forecasts = new Map(await Promise.all(throughDates.map(async (throughDate) => [throughDate,
    await getOperationalForecast(restaurantId, today, throughDate, db, context.asOfDate)] as const)));
  const blockers = [...new Set([...forecasts.values()].flatMap((forecast) => forecast.blockers))];
  const suggestions = products.flatMap((product) => {
    const horizon = horizons.get(product.supplierId)!;
    const forecast = forecasts.get(horizon.status === "known" ? horizon.throughDate : today)!;
    const ingredient = forecast.ingredientNeeds.find((need) => need.productId === product.id);
    if (!ingredient) return [];
    const need = { ...ingredient, forecastNeed: ingredient.quantity };
    const count = latestCount.get(product.id);
    const countVerified = count?.stockRevisionAfter === product.stockRevision && count?.unit === product.unit;
    const arrivals = expectedLines.filter((line) => line.productId === product.id && line.unit === product.unit && line.expectedDeliveryDate &&
      line.expectedDeliveryDate >= today && line.expectedDeliveryDate <= forecast.throughDate).map((line) => ({ date: line.expectedDeliveryDate!, quantity: Math.max(0, line.quantity - line.receivedQuantity) }));
    const availability = countVerified ? purchaseAvailability(Number(count.countedQuantity),
      lots.filter((lot) => lot.productId === product.id).map((lot) => ({ quantity: Number(lot.remainingQuantity), expiresAt: lot.expiresAt?.toISOString().slice(0, 10) ?? null })),
      forecast.services.flatMap((service) => service.ingredientNeeds.filter((ingredient) => ingredient.productId === product.id && ingredient.unit === product.unit)
        .map((ingredient) => ({ date: service.date, slot: service.slot, quantity: ingredient.quantity }))), arrivals, today, horizon.status === "known" ? horizon.nextDeliveryDate : today) : null;
    return [suggestionFor(need, product, count, workspaceMode, context,
      forecast.provenance === "recorded_sales", blockers.length === 0, inputDate,
      roundQuantity(arrivals.reduce((sum, arrival) => sum + arrival.quantity, 0)), availability,
      forecast.services.flatMap(service => service.weatherAdjustment && service.ingredientNeeds.some(ingredient => ingredient.productId === product.id)
        ? [{ date: service.date, slot: service.slot, adjustment: service.weatherAdjustment }] : []))];
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
  return { status: "ready", provenance: context.provenance,
    workspaceMode, model: context.model, asOfDate: context.asOfDate, forecastDate: context.forecastDate,
    completeServiceDays: baseline.completeServiceDays, blockers,
    suggestions: suggestions.map((suggestion) => ({ ...suggestion, decision: decisionsBySuggestion.get(
      `${suggestion.productId}\u0000${suggestion.suggestionKey}`) ?? null })),
    assumptions: ["Les besoins cumulent les services planifiés et leurs cartes jusqu’à la veille de la livraison suivante; l’arrivée le jour de livraison reste à confirmer.",
      "Les contraintes de livraison inconnues et les conditionnements non renseignés bloquent la suggestion.",
      "La couverture est simulée par date et FEFO : les lots à échéance dépassée ne couvrent pas un service ultérieur. Une échéance inconnue reste à vérifier par le chef.",
      "Les commandes attendues ne sont pas du stock disponible. Le besoin conditionnel reste soumis à leur réception.",
      "Le prix utilise le catalogue actuel, à titre indicatif; ce n’est pas un prix historique ni un montant comptable.", forecastWeatherNotice] };
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
    if (input.decision === "added" && !isOrderQuantity(input.quantity!, suggestion.orderStep))
      throw new WorkspaceError(400, "INVALID_ORDER_QUANTITY", `${orderStepLabel(suggestion.orderStep, suggestion.unit)} ; quantité maximale : 1 000 000.`);
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
