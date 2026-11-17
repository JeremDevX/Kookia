import { dateAt, dayOffset, estimatedUnsoldPortions, isOpen, soldPortions } from "./restaurantSimulationDemand.js";
import { scenarioProducts, scenarioRecipes, type ScenarioProduct } from "./restaurantSimulationCatalog.js";
import { sourceInvoiceSupplierId, type InvoiceReceipt } from "./restaurantSimulationReceipts.js";
import { buildScenarioRecipeVersions, recipeVersionForDate } from "./restaurantSimulationVersions.js";
import { SIMULATION_VERSION, stableUuid } from "./restaurantSimulationIdentity.js";

export interface PlannedMovement {
  productId: string;
  productKey: string;
  delta: number;
  reason: "simulation_opening" | "invoice_import_demo" | "simulation_restock" | "production" | "simulation_loss" | "stock_count" | "loss";
  operationId: string;
  at: string;
  stockCountOperationId?: string;
  invoiceId?: string;
  supplierName?: string;
}

interface PlannedSale {
  id: string;
  itemId: string;
  itemName: string;
  recipeId: string;
  date: string;
  quantity: number;
  operationId: string;
  productionOperationId: string;
  productionId: string;
  portionsPrepared: number;
  estimatedUnsold: number;
  createdAt: string;
}

export interface PlannedProduction {
  id: string;
  recipeId: string;
  recipeName: string;
  date: string;
  portions: number;
  prepTime: number;
  kind: "production" | "refusal";
  recipeVersionSequence: number;
  notes: string;
  operationId: string;
  createdAt: string;
}

interface PlannedStockCount {
  id: string;
  productId: string;
  productKey: string;
  unit: string;
  countedQuantity: number;
  theoreticalQuantity: number;
  delta: number;
  stockRevisionBefore: number;
  stockRevisionAfter: number;
  operationId: string;
  countDate: string;
  countedAt: string;
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const productByKey = new Map(scenarioProducts.map((product) => [product.key, product]));
const DEMO_STORY_DATES = { overstock: "2025-06-13", explicitLoss: "2025-06-13", refusal: "2025-12-26" };

function roundOrderQuantity(product: ScenarioProduct, amount: number) {
  return product.unit === "pcs" ? Math.ceil(amount) : round(amount);
}

export function planSimulationChronology({ startDate, endDate, includeDemoStory, receipts, openings, balances, coverage }: {
  startDate: string; endDate: string; includeDemoStory: boolean;
  receipts: InvoiceReceipt[]; openings: PlannedMovement[]; balances: Map<string, number>;
  coverage: Map<string, Record<string, number>>;
}) {
  const invoicePrices = new Map<string, number[]>();
  const receivedMetadata = new Map<string, { supplierId: string; supplierName: string; lastDelivery: string }>();
  const receiptsByDate = new Map<string, InvoiceReceipt[]>();
  for (const receipt of receipts) {
    const rows = receiptsByDate.get(receipt.date) ?? [];
    rows.push(receipt);
    receiptsByDate.set(receipt.date, rows);
  }
  const movements = [...openings];
  const sales: PlannedSale[] = [];
  const productions: PlannedProduction[] = [];
  const stockCounts: PlannedStockCount[] = [];
  const recipeVersions = buildScenarioRecipeVersions(startDate, includeDemoStory);
  const stockRevisionByProduct = new Map(scenarioProducts.map((product) => [product.id, 1]));
  const serviceDaysByDate = new Set<string>();

  const recordCount = (date: string, hour: number, minute: number, productKey: string,
    countedQuantity: number, eventKey: string) => {
    const product = productByKey.get(productKey)!;
    const theoreticalQuantity = balances.get(productKey) ?? 0;
    if (countedQuantity < 0) throw new Error(`Comptage négatif interdit pour ${product.name}.`);
    const delta = round(countedQuantity - theoreticalQuantity);
    const stockRevisionBefore = stockRevisionByProduct.get(product.id) ?? 1;
    const stockRevisionAfter = stockRevisionBefore + Number(delta !== 0);
    const operationId = `${SIMULATION_VERSION}:stock-count:${date}:${product.id}:${eventKey}`;
    const count: PlannedStockCount = { id: stableUuid(operationId), productId: product.id, productKey,
      unit: product.unit, countedQuantity: round(countedQuantity), theoreticalQuantity, delta,
      stockRevisionBefore, stockRevisionAfter, operationId, countDate: date, countedAt: dateAt(date, hour, minute) };
    stockCounts.push(count);
    if (delta !== 0) movements.push({ productId: product.id, productKey, delta, reason: "stock_count",
      operationId: `${operationId}:movement`, stockCountOperationId: operationId, at: count.countedAt });
    balances.set(productKey, count.countedQuantity);
    stockRevisionByProduct.set(product.id, stockRevisionAfter);
    const report = coverage.get(date.slice(0, 4))!;
    report.stockCounts++;
    if (delta > 0) report.overstockCounts++;
    return count;
  };

  if (includeDemoStory && (!isOpen(DEMO_STORY_DATES.overstock, endDate) ||
    !isOpen(DEMO_STORY_DATES.refusal, endDate))) {
    throw new Error("Les dates des événements de démonstration doivent rester des jours de service.");
  }

  for (let date = startDate; date <= endDate; date = dayOffset(date, 1)) {
    const dayReceipts = receiptsByDate.get(date) ?? [];
    for (const receipt of dayReceipts) {
      const product = productByKey.get(receipt.productKey)!;
      const operationId = `${SIMULATION_VERSION}:invoice:${receipt.invoiceId}:${product.id}`;
      movements.push({ productId: product.id, productKey: product.key, delta: receipt.quantity,
        reason: "invoice_import_demo", operationId, at: dateAt(date, 8), invoiceId: receipt.invoiceId,
        supplierName: receipt.supplier });
      balances.set(product.key, round((balances.get(product.key) ?? 0) + receipt.quantity));
      const observed = invoicePrices.get(product.key) ?? [];
      if (receipt.pricePerUnit > 0) observed.push(receipt.pricePerUnit);
      invoicePrices.set(product.key, observed);
      receivedMetadata.set(product.key, { supplierId: sourceInvoiceSupplierId(receipt.supplier),
        supplierName: receipt.supplier, lastDelivery: date });
    }

    if (includeDemoStory && date === DEMO_STORY_DATES.overstock) recordCount(date, 8, 30, "tomatoes", 60, "overstock");
    if (includeDemoStory && date === DEMO_STORY_DATES.refusal) recordCount(date, 8, 30, "cream", 0.05, "shortage");

    if (!isOpen(date, endDate)) continue;
    const month = Number(date.slice(5, 7));
    const dailyRecipes = scenarioRecipes.filter((recipe) => !recipe.seasonalMonths || recipe.seasonalMonths.includes(month));
    if (!dailyRecipes.length) continue;
    serviceDaysByDate.add(date);
    coverage.get(date.slice(0, 4))!.serviceDays++;
    const batches = dailyRecipes.map((recipe) => {
      const sold = soldPortions(recipe.id, recipe.baseDailyPortions, date);
      const unsold = estimatedUnsoldPortions(recipe.id, sold, date);
      const version = recipeVersionForDate(recipeVersions, recipe.id, date);
      return { recipe: { ...recipe, ingredients: version.ingredients.map(({ productKey, quantity }) => ({ productKey, quantity })) },
        version, sold, unsold, prepared: sold + unsold };
    });

    const refusingToday = includeDemoStory && date === DEMO_STORY_DATES.refusal;
    if (refusingToday) {
      const batch = batches.find((candidate) => candidate.recipe.id === "r3");
      if (!batch) throw new Error("La recette du refus de démonstration n’est pas au menu à la date choisie.");
      const requestedPortions = 35;
      const blockers = batch.recipe.ingredients.flatMap((ingredient) => {
        const available = balances.get(ingredient.productKey) ?? 0;
        const needed = round(ingredient.quantity * requestedPortions);
        if (available + 0.0005 >= needed) return [];
        const product = productByKey.get(ingredient.productKey)!;
        return [`${product.name} : ${available} ${product.unit} disponibles, ${needed} ${product.unit} requis`];
      });
      if (!blockers.length) throw new Error("Le refus de démonstration exige une insuffisance de stock vérifiable.");
      const operationId = `${SIMULATION_VERSION}:production-refusal:${batch.recipe.id}:${date}:stock-insuffisant`;
      productions.push({ id: stableUuid(operationId), recipeId: batch.recipe.id, recipeName: batch.recipe.name, date,
        portions: requestedPortions, prepTime: batch.recipe.prepTime, kind: "refusal",
        recipeVersionSequence: batch.version.sequence,
        notes: `${SIMULATION_VERSION}; demande de ${requestedPortions} portions refusée : stock insuffisant (${blockers.join(" ; ")}). Aucune sortie de stock.`,
        operationId, createdAt: dateAt(date, 9, 0) });
      const report = coverage.get(date.slice(0, 4))!;
      report.productions++;
      report.refusedProductions++;
    }

    const demand = new Map<string, number>();
    for (const batch of batches) for (const ingredient of batch.recipe.ingredients) {
      demand.set(ingredient.productKey, round((demand.get(ingredient.productKey) ?? 0) + ingredient.quantity * batch.prepared));
    }
    for (const [productKey, amountNeeded] of demand) {
      const product = productByKey.get(productKey)!;
      const available = balances.get(productKey) ?? 0;
      if (available + 0.0005 >= amountNeeded) continue;
      const order = roundOrderQuantity(product, Math.max(amountNeeded, product.restockLevel) - available);
      if (order <= 0) continue;
      const operationId = `${SIMULATION_VERSION}:restock:${date}:${product.id}`;
      movements.push({ productId: product.id, productKey, delta: order, reason: "simulation_restock", operationId,
        at: dateAt(date, refusingToday ? 10 : 9) });
      balances.set(productKey, round(available + order));
      coverage.get(date.slice(0, 4))!.syntheticRestocks++;
    }

    for (const batch of batches) {
      const { recipe, version, sold, unsold, prepared } = batch;
      const productionOperationId = `${SIMULATION_VERSION}:production:${recipe.id}:${date}`;
      const saleOperationId = `${productionOperationId}:sale`;
      const itemId = stableUuid(`${SIMULATION_VERSION}:sale-item:${recipe.id}`);
      const productionId = stableUuid(productionOperationId);
      const saleId = stableUuid(saleOperationId);
      for (const ingredient of recipe.ingredients) {
        const product = productByKey.get(ingredient.productKey)!;
        const produced = round(ingredient.quantity * sold);
        const wasted = round(ingredient.quantity * unsold);
        if (product.unit === "pcs" && (!Number.isInteger(produced) || !Number.isInteger(wasted))) {
          throw new Error(`Consommation fractionnaire en pièces : ${recipe.name}.`);
        }
        if (produced > 0) movements.push({ productId: product.id, productKey: product.key, delta: -produced,
          reason: "production", operationId: productionOperationId, at: dateAt(date, 12) });
        if (wasted > 0) movements.push({ productId: product.id, productKey: product.key, delta: -wasted,
          reason: "simulation_loss", operationId: `${productionOperationId}:unsold`, at: dateAt(date, 12) });
        balances.set(ingredient.productKey, round((balances.get(ingredient.productKey) ?? 0) - produced - wasted));
      }
      const itemName = `${recipe.name} — démonstration`;
      sales.push({ id: saleId, itemId, itemName, recipeId: recipe.id, date, quantity: sold,
        operationId: saleOperationId, productionOperationId, productionId, portionsPrepared: prepared,
        estimatedUnsold: unsold, createdAt: dateAt(date, 19) });
      productions.push({ id: productionId, recipeId: recipe.id, recipeName: recipe.name, date, portions: prepared,
        prepTime: recipe.prepTime, kind: "production", recipeVersionSequence: version.sequence,
        notes: `${SIMULATION_VERSION}; ventes liées: ${saleOperationId}; ${sold} portion(s) vendue(s), ${prepared} préparée(s), ${unsold} invendue(s) simulée(s) (hypothèse moyenne de 1,5 %, non observée).`,
        operationId: productionOperationId, createdAt: dateAt(date, 12) });
      coverage.get(date.slice(0, 4))!.sales++;
      coverage.get(date.slice(0, 4))!.productions++;
      coverage.get(date.slice(0, 4))!.soldPortions += sold;
      coverage.get(date.slice(0, 4))!.preparedPortions += prepared;
      coverage.get(date.slice(0, 4))!.estimatedUnsoldPortions += unsold;
    }

    if (includeDemoStory && date === DEMO_STORY_DATES.explicitLoss) {
      const product = productByKey.get("tomatoes")!;
      const loss = 10;
      const available = balances.get(product.key) ?? 0;
      if (available + 0.0005 < loss) throw new Error("La perte simulée dépasserait le stock disponible.");
      const operationId = `${SIMULATION_VERSION}:scenario-loss:${date}:${product.id}:lot-ecarte`;
      movements.push({ productId: product.id, productKey: product.key, delta: -loss, reason: "loss", operationId,
        at: dateAt(date, 16) });
      balances.set(product.key, round(available - loss));
      coverage.get(date.slice(0, 4))!.explicitLosses++;
    }
  }

  if (includeDemoStory) {
    const tomato = productByKey.get("tomatoes")!;
    recordCount(endDate, 18, 0, tomato.key, balances.get(tomato.key) ?? 0, "current");
  }

  return { movements, sales, productions, stockCounts, recipeVersions, serviceDaysByDate, invoicePrices, receivedMetadata };
}
