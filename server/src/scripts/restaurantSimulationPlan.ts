import { createHash } from "node:crypto";
import type { SourceInvoice } from "./sourceInvoices.js";
import { dateAt, dayOffset, estimatedUnsoldPortions, isOpen, soldPortions } from "./restaurantSimulationDemand.js";
import { auditMovements } from "./restaurantSimulationLedger.js";
import { makeReceiptGroups, sourceInvoiceSupplierId, type InvoiceReceipt } from "./restaurantSimulationReceipts.js";
import {
  initialInventory, recipeIngredientRows, scenarioProducts, scenarioRecipes, type ScenarioProduct,
} from "./restaurantSimulationCatalog.js";

export const SIMULATION_VERSION = "restaurant-simulation-v1";
export const SIMULATION_FROM = "2023-05-03";
export const SIMULATION_TO = "2026-09-23";
export const SIMULATION_MARKER = "restaurant-simulation:v1";

export interface ExistingProductSnapshot {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
  pricePerUnit: number;
  supplierId: string;
  category: string;
}

export interface PlannedMovement {
  productId: string;
  productKey: string;
  delta: number;
  reason: "simulation_opening" | "invoice_import_demo" | "simulation_restock" | "production" | "simulation_loss";
  operationId: string;
  at: string;
  invoiceId?: string;
}

export interface PlannedSale {
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
  notes: string;
  operationId: string;
  createdAt: string;
}

type ReferencePriceBasis = "invoice_median" | "seed_catalogue_converted" | "scenario_default";

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const productByKey = new Map(scenarioProducts.map((product) => [product.key, product]));

function roundOrderQuantity(product: ScenarioProduct, amount: number) {
  return product.unit === "pcs" ? Math.ceil(amount) : round(amount);
}

export function buildRestaurantSimulation(invoices: SourceInvoice[], existingProducts: ExistingProductSnapshot[]) {
  if (invoices.length !== 431) throw new Error(`Nombre de fiches source inattendu : ${invoices.length}.`);
  const dates = invoices.map((invoice) => invoice.date).filter((date): date is string => !!date).sort();
  if (dates[0] !== SIMULATION_FROM || dates.at(-1) !== SIMULATION_TO) throw new Error("La période des fiches ne correspond pas au scénario attendu.");
  const years = new Set(invoices.map((invoice) => invoice.date?.slice(0, 4) ?? "sans-date"));
  const coverage = new Map<string, Record<string, number>>();
  for (const year of years) coverage.set(year, { documents: 0, invoices: 0, credits: 0, deliveries: 0, parsedLines: 0,
    priceTaxHTLines: 0, priceTaxTTCLines: 0, priceTaxUnknownLines: 0,
    mappedLines: 0, directLines: 0, explicitPackageLines: 0, estimatedLines: 0, nonExploitableLines: 0,
    outsideMenuLines: 0, documentsWithoutStockLines: 0, serviceDays: 0, sales: 0, productions: 0,
    soldPortions: 0, preparedPortions: 0, estimatedUnsoldPortions: 0,
    invoiceReceipts: 0, syntheticRestocks: 0, simulationLossMovements: 0 });
  for (const invoice of invoices) {
    const report = coverage.get(invoice.date?.slice(0, 4) ?? "sans-date")!;
    report.documents++;
    report[invoice.type === "credit" ? "credits" : invoice.type === "delivery" ? "deliveries" : "invoices"]++;
    report.documentsWithoutStockLines += Number(invoice.stockLines.length === 0);
  }

  const receipts = makeReceiptGroups(invoices, coverage);
  for (const receipt of receipts) coverage.get(receipt.date.slice(0, 4))!.invoiceReceipts++;
  const existingById = new Map(existingProducts.map((product) => [product.id, product]));
  const openings: PlannedMovement[] = [];
  const balances = new Map<string, number>();
  const prices = new Map<string, number>();
  const invoicePrices = new Map<string, number[]>();
  const priceBasis = new Map<string, ReferencePriceBasis>();
  const productMetadata = new Map<string, { supplierId?: string; supplierName?: string; lastDelivery?: string }>();
  for (const product of scenarioProducts) {
    const prior = existingById.get(product.id);
    if (product.id.startsWith("simulation-v1-") && prior) throw new Error(`Produit réservé déjà présent : ${product.id}.`);
    if (!product.id.startsWith("simulation-v1-") && !prior) throw new Error(`Produit seed absent : ${product.id}.`);
    const originalUnit = prior?.unit ?? product.unit;
    const originalStock = prior?.currentStock ?? 0;
    const opening = initialInventory(product, originalUnit, originalStock);
    balances.set(product.key, opening.quantity);
    prices.set(product.key, round((prior?.pricePerUnit ?? product.defaultPrice) / opening.factor, 4));
    priceBasis.set(product.key, prior ? "seed_catalogue_converted" : "scenario_default");
    productMetadata.set(product.key, { supplierId: prior?.supplierId ?? product.supplierId });
    if (opening.quantity > 0) openings.push({ productId: product.id, productKey: product.key,
      delta: opening.quantity, reason: "simulation_opening", operationId: `${SIMULATION_VERSION}:opening:${product.id}`,
      at: dateAt(dayOffset(SIMULATION_FROM, -1), 6) });
  }

  const receiptsByDate = new Map<string, InvoiceReceipt[]>();
  for (const receipt of receipts) {
    const rows = receiptsByDate.get(receipt.date) ?? [];
    rows.push(receipt);
    receiptsByDate.set(receipt.date, rows);
  }
  const movements = [...openings];
  const sales: PlannedSale[] = [];
  const productions: PlannedProduction[] = [];
  const serviceDaysByDate = new Set<string>();

  for (let date = SIMULATION_FROM; date <= SIMULATION_TO; date = dayOffset(date, 1)) {
    const dayReceipts = receiptsByDate.get(date) ?? [];
    for (const receipt of dayReceipts) {
      const product = productByKey.get(receipt.productKey)!;
      const operationId = `${SIMULATION_VERSION}:invoice:${receipt.invoiceId}:${product.id}`;
      movements.push({ productId: product.id, productKey: product.key, delta: receipt.quantity,
        reason: "invoice_import_demo", operationId, at: dateAt(date, 8), invoiceId: receipt.invoiceId });
      balances.set(product.key, round((balances.get(product.key) ?? 0) + receipt.quantity));
      const observed = invoicePrices.get(product.key) ?? [];
      if (receipt.pricePerUnit > 0) observed.push(receipt.pricePerUnit);
      invoicePrices.set(product.key, observed);
      productMetadata.set(product.key, { supplierId: sourceInvoiceSupplierId(receipt.supplier),
        supplierName: receipt.supplier, lastDelivery: date });
    }

    if (!isOpen(date, SIMULATION_TO)) continue;
    const month = Number(date.slice(5, 7));
    const dailyRecipes = scenarioRecipes.filter((recipe) => !recipe.seasonalMonths || recipe.seasonalMonths.includes(month));
    if (!dailyRecipes.length) continue;
    serviceDaysByDate.add(date);
    coverage.get(date.slice(0, 4))!.serviceDays++;
    const batches = dailyRecipes.map((recipe) => {
      const sold = soldPortions(recipe.id, recipe.baseDailyPortions, date);
      const unsold = estimatedUnsoldPortions(recipe.id, sold, date);
      return { recipe, sold, unsold, prepared: sold + unsold };
    });
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
      movements.push({ productId: product.id, productKey, delta: order, reason: "simulation_restock", operationId, at: dateAt(date, 9) });
      balances.set(productKey, round(available + order));
      coverage.get(date.slice(0, 4))!.syntheticRestocks++;
    }

    for (const batch of batches) {
      const { recipe, sold, unsold, prepared } = batch;
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
        prepTime: recipe.prepTime, notes: `${SIMULATION_VERSION}; ventes liées: ${saleOperationId}; ${sold} portion(s) vendue(s), ${prepared} préparée(s), ${unsold} invendue(s) simulée(s) (hypothèse moyenne de 1,5 %, non observée).`,
        operationId: productionOperationId, createdAt: dateAt(date, 12) });
      coverage.get(date.slice(0, 4))!.sales++;
      coverage.get(date.slice(0, 4))!.productions++;
      coverage.get(date.slice(0, 4))!.soldPortions += sold;
      coverage.get(date.slice(0, 4))!.preparedPortions += prepared;
      coverage.get(date.slice(0, 4))!.estimatedUnsoldPortions += unsold;
    }
  }

  for (const [productKey, observed] of invoicePrices) {
    if (observed.length) {
      prices.set(productKey, round(median(observed), 4));
      priceBasis.set(productKey, "invoice_median");
    }
  }

  const closingStocks = auditMovements(movements, scenarioProducts);
  for (const movement of movements) if (movement.reason === "simulation_loss") {
    coverage.get(movement.at.slice(0, 4))!.simulationLossMovements++;
  }
  for (const product of scenarioProducts) {
    const close = closingStocks[product.id] ?? 0;
    if (product.unit === "pcs" && !Number.isInteger(close)) throw new Error(`Stock de clôture fractionnaire en pièces : ${product.name}.`);
  }
  const asOf = SIMULATION_TO;
  const baselineFrom = dayOffset(asOf, -28);
  for (const recipe of scenarioRecipes) {
    for (let date = baselineFrom; date < asOf; date = dayOffset(date, 1)) {
      if (!serviceDaysByDate.has(date) || !sales.some((sale) => sale.recipeId === recipe.id && sale.date === date)) {
        throw new Error(`Fenêtre baseline incomplète pour ${recipe.name} au ${date}.`);
      }
    }
  }
  const unitCosts = Object.fromEntries(scenarioRecipes.map((recipe) => [recipe.id, round(recipe.ingredients.reduce((sum, ingredient) => {
    const product = productByKey.get(ingredient.productKey)!;
    return sum + ingredient.quantity * (prices.get(product.key) ?? product.defaultPrice);
  }, 0), 2)]));
  const sourceDigest = createHash("sha256").update(JSON.stringify({ version: SIMULATION_VERSION,
    invoices: invoices.map((invoice) => [invoice.id, invoice.contentHash]), receipts,
    initialProducts: existingProducts.map((product) => [product.id, product.unit, product.currentStock,
      product.minThreshold, product.pricePerUnit, product.supplierId]).sort(([a], [b]) => String(a).localeCompare(String(b))),
    products: scenarioProducts, recipes: scenarioRecipes })).digest("hex");
  const yearCoverage = Object.fromEntries([...coverage.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const productState = scenarioProducts.map((product) => ({ id: product.id, key: product.key, name: product.name,
    unit: product.unit, minThreshold: product.minThreshold, opening: balances.has(product.key) ? openings.find(m => m.productKey === product.key)?.delta ?? 0 : 0,
    closing: closingStocks[product.id] ?? 0, pricePerUnit: prices.get(product.key) ?? product.defaultPrice,
    priceBasis: priceBasis.get(product.key) ?? "scenario_default",
    ...(productMetadata.get(product.key)?.supplierId ? { supplierId: productMetadata.get(product.key)!.supplierId } : {}),
    ...(productMetadata.get(product.key)?.supplierName ? { supplierName: productMetadata.get(product.key)!.supplierName } : {}),
    ...(productMetadata.get(product.key)?.lastDelivery ? { lastDelivery: productMetadata.get(product.key)!.lastDelivery } : {}) }));

  return { version: SIMULATION_VERSION, marker: SIMULATION_MARKER, sourceDigest, startDate: SIMULATION_FROM, endDate: SIMULATION_TO,
    receipts, movements: movements.sort((a, b) => a.at.localeCompare(b.at) || a.operationId.localeCompare(b.operationId)),
    serviceDays: [...serviceDaysByDate].sort(), sales, productions, productState, yearCoverage, unitCosts,
    counts: { invoiceDocuments: invoices.length, parsedLines: [...coverage.values()].reduce((n, row) => n + row.parsedLines, 0),
      mappedLines: [...coverage.values()].reduce((n, row) => n + row.mappedLines, 0),
      estimatedLines: [...coverage.values()].reduce((n, row) => n + row.estimatedLines, 0),
      nonExploitableLines: [...coverage.values()].reduce((n, row) => n + row.nonExploitableLines, 0),
      outsideMenuLines: [...coverage.values()].reduce((n, row) => n + row.outsideMenuLines, 0),
      serviceDays: serviceDaysByDate.size, sales: sales.length, productions: productions.length,
      invoiceReceipts: receipts.length, syntheticRestocks: movements.filter(m => m.reason === "simulation_restock").length,
      soldPortions: sales.reduce((sum, sale) => sum + sale.quantity, 0),
      preparedPortions: productions.reduce((sum, production) => sum + production.portions, 0),
      estimatedUnsoldPortions: sales.reduce((sum, sale) => sum + sale.estimatedUnsold, 0),
      simulationLossMovements: movements.filter((movement) => movement.reason === "simulation_loss").length,
      stockMovements: movements.length },
  };
}

export function stableUuid(value: string) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getScenarioProduct(id: string) { return scenarioProducts.find((product) => product.id === id); }
export function getScenarioRecipeIngredients(recipeId: string) {
  const recipe = scenarioRecipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) throw new Error(`Recette de scénario absente : ${recipeId}.`);
  return recipeIngredientRows(recipe);
}
