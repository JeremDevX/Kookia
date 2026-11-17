import { createHash } from "node:crypto";
import type { SourceInvoice } from "./sourceInvoices.js";
import { addCalendarDays } from "../../../shared/calendarDate.js";
import { dateAt } from "./restaurantSimulationDemand.js";
import { auditMovements } from "./restaurantSimulationLedger.js";
import { makeReceiptGroups } from "./restaurantSimulationReceipts.js";
import {
  initialInventory, recipeIngredientRows, scenarioProducts, scenarioRecipes,
} from "./restaurantSimulationCatalog.js";
import { recipeVersionForDate } from "./restaurantSimulationVersions.js";
import { planSimulationChronology, type PlannedMovement } from "./restaurantSimulationChronology.js";
import { SIMULATION_MARKER, SIMULATION_VERSION } from "./restaurantSimulationIdentity.js";

export { SIMULATION_MARKER, SIMULATION_VERSION, stableUuid } from "./restaurantSimulationIdentity.js";
export type { PlannedProduction } from "./restaurantSimulationChronology.js";

const SIMULATION_FROM = "2023-05-03";
const SIMULATION_INPUTS_TO = "2026-09-23";
const SIMULATION_TO = "2026-09-24";

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

type ReferencePriceBasis = "invoice_median" | "seed_catalogue_converted" | "scenario_default";

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const productByKey = new Map(scenarioProducts.map((product) => [product.key, product]));

export function buildRestaurantSimulation(invoices: SourceInvoice[], existingProducts: ExistingProductSnapshot[], includeDemoStory = false) {
  if (invoices.length !== 431) throw new Error(`Nombre de fiches source inattendu : ${invoices.length}.`);
  const dates = invoices.map((invoice) => invoice.date).filter((date): date is string => !!date).sort();
  if (dates[0] !== SIMULATION_FROM || dates.at(-1) !== SIMULATION_INPUTS_TO) throw new Error("La période des fiches ne correspond pas au scénario attendu.");
  const years = new Set(invoices.map((invoice) => invoice.date?.slice(0, 4) ?? "sans-date"));
  const coverage = new Map<string, Record<string, number>>();
  for (const year of years) coverage.set(year, { documents: 0, invoices: 0, credits: 0, deliveries: 0, parsedLines: 0,
    priceTaxHTLines: 0, priceTaxTTCLines: 0, priceTaxUnknownLines: 0,
    mappedLines: 0, directLines: 0, explicitPackageLines: 0, estimatedLines: 0, nonExploitableLines: 0,
    outsideMenuLines: 0, documentsWithoutStockLines: 0, serviceDays: 0, sales: 0, productions: 0,
    soldPortions: 0, preparedPortions: 0, estimatedUnsoldPortions: 0,
    invoiceReceipts: 0, syntheticRestocks: 0, simulationLossMovements: 0, stockCounts: 0,
    overstockCounts: 0, explicitLosses: 0, refusedProductions: 0 });
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
      at: dateAt(addCalendarDays(SIMULATION_FROM, -1), 6) });
  }

  const { movements, sales, productions, stockCounts, recipeVersions, serviceDaysByDate, invoicePrices, receivedMetadata } =
    planSimulationChronology({ startDate: SIMULATION_FROM, endDate: SIMULATION_TO,
      includeDemoStory, receipts, openings, balances, coverage });
  for (const [productKey, metadata] of receivedMetadata) productMetadata.set(productKey, metadata);

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
  const baselineFrom = addCalendarDays(asOf, -28);
  for (const recipe of scenarioRecipes) {
    for (let date = baselineFrom; date < asOf; date = addCalendarDays(date, 1)) {
      if (!serviceDaysByDate.has(date) || !sales.some((sale) => sale.recipeId === recipe.id && sale.date === date)) {
        throw new Error(`Fenêtre baseline incomplète pour ${recipe.name} au ${date}.`);
      }
    }
  }
  const unitCosts = Object.fromEntries(scenarioRecipes.map((recipe) => [recipe.id,
    round(recipeVersionForDate(recipeVersions, recipe.id, SIMULATION_TO).ingredients.reduce((sum, ingredient) => {
    const product = productByKey.get(ingredient.productKey)!;
    return sum + ingredient.quantity * (prices.get(product.key) ?? product.defaultPrice);
  }, 0), 2)]));
  const digestPayload = { version: SIMULATION_VERSION,
    invoices: invoices.map((invoice) => [invoice.id, invoice.contentHash]), receipts,
    initialProducts: existingProducts.map((product) => [product.id, product.unit, product.currentStock,
      product.minThreshold, product.pricePerUnit, product.supplierId]).sort(([a], [b]) => String(a).localeCompare(String(b))),
    products: scenarioProducts, recipes: scenarioRecipes };
  const sourceDigest = createHash("sha256").update(JSON.stringify(includeDemoStory
    ? { ...digestPayload, demonstrationStory: { recipeVersions, stockCounts,
      refusedProductions: productions.filter((production) => production.kind === "refusal"),
      explicitLosses: movements.filter((movement) => movement.reason === "loss") } }
    : digestPayload)).digest("hex");
  const yearCoverage = Object.fromEntries([...coverage.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const productState = scenarioProducts.map((product) => {
    const latestCount = stockCounts.filter((count) => count.productId === product.id)
      .sort((left, right) => right.countedAt.localeCompare(left.countedAt))[0];
    const stockRevision = latestCount ? latestCount.stockRevisionAfter + Number(movements.some((movement) =>
      movement.productId === product.id && movement.at > latestCount.countedAt)) : undefined;
    return { id: product.id, key: product.key, name: product.name,
    unit: product.unit, minThreshold: product.minThreshold, opening: balances.has(product.key) ? openings.find(m => m.productKey === product.key)?.delta ?? 0 : 0,
    closing: closingStocks[product.id] ?? 0, pricePerUnit: prices.get(product.key) ?? product.defaultPrice,
    priceBasis: priceBasis.get(product.key) ?? "scenario_default",
    ...(stockRevision !== undefined ? { stockRevision } : {}),
    ...(productMetadata.get(product.key)?.supplierId ? { supplierId: productMetadata.get(product.key)!.supplierId } : {}),
    ...(productMetadata.get(product.key)?.supplierName ? { supplierName: productMetadata.get(product.key)!.supplierName } : {}),
    ...(productMetadata.get(product.key)?.lastDelivery ? { lastDelivery: productMetadata.get(product.key)!.lastDelivery } : {}) };
  });

  return { version: SIMULATION_VERSION, marker: SIMULATION_MARKER, sourceDigest, startDate: SIMULATION_FROM, endDate: SIMULATION_TO,
    receipts, movements: movements.sort((a, b) => a.at.localeCompare(b.at) || a.operationId.localeCompare(b.operationId)),
    serviceDays: [...serviceDaysByDate].sort(), sales, productions, stockCounts, recipeVersions, productState, yearCoverage, unitCosts,
    counts: { invoiceDocuments: invoices.length, parsedLines: [...coverage.values()].reduce((n, row) => n + row.parsedLines, 0),
      mappedLines: [...coverage.values()].reduce((n, row) => n + row.mappedLines, 0),
      estimatedLines: [...coverage.values()].reduce((n, row) => n + row.estimatedLines, 0),
      nonExploitableLines: [...coverage.values()].reduce((n, row) => n + row.nonExploitableLines, 0),
      outsideMenuLines: [...coverage.values()].reduce((n, row) => n + row.outsideMenuLines, 0),
      serviceDays: serviceDaysByDate.size, sales: sales.length, productions: productions.length,
      invoiceReceipts: receipts.length, syntheticRestocks: movements.filter(m => m.reason === "simulation_restock").length,
      stockCounts: stockCounts.length, overstockCounts: stockCounts.filter((count) => count.delta > 0).length,
      explicitLosses: movements.filter((movement) => movement.reason === "loss").length,
      refusedProductions: productions.filter((production) => production.kind === "refusal").length,
      soldPortions: sales.reduce((sum, sale) => sum + sale.quantity, 0),
      preparedPortions: productions.filter((production) => production.kind === "production")
        .reduce((sum, production) => sum + production.portions, 0),
      estimatedUnsoldPortions: sales.reduce((sum, sale) => sum + sale.estimatedUnsold, 0),
      simulationLossMovements: movements.filter((movement) => movement.reason === "simulation_loss").length,
      stockMovements: movements.length },
  };
}

export function getScenarioRecipeIngredients(recipeId: string) {
  const recipe = scenarioRecipes.find((candidate) => candidate.id === recipeId);
  if (!recipe) throw new Error(`Recette de scénario absente : ${recipeId}.`);
  return recipeIngredientRows(recipe);
}
