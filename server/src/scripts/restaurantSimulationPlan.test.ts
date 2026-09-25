import { expect, it } from "vitest";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { buildRestaurantSimulation } from "./restaurantSimulationPlan.js";
import { createAnonymizedSourceInvoices } from "./fixtures/anonymizedSourceInvoices.js";

it("builds a complete, deterministic multi-year service and inventory ledger", () => {
  const products = catalog.products.map((product) => ({ ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit) }));
  const invoices = createAnonymizedSourceInvoices();
  const plan = buildRestaurantSimulation(invoices, products);
  const replay = buildRestaurantSimulation(createAnonymizedSourceInvoices(), products);
  expect(plan.counts.invoiceDocuments).toBe(431);
  expect(replay).toEqual(plan);
  expect(plan.sourceDigest).toBe(replay.sourceDigest);
  expect(plan.movements).toEqual(replay.movements);
  expect(plan.counts.serviceDays).toBeGreaterThan(900);
  expect(plan.serviceDays).toHaveLength(plan.counts.serviceDays);
  expect(plan.serviceDays.every((date) => plan.sales.some((sale) => sale.date === date))).toBe(true);
  expect(plan.sales).toHaveLength(plan.productions.length);
  expect(plan.sales.every((sale) => sale.portionsPrepared === sale.quantity + sale.estimatedUnsold)).toBe(true);
  expect(plan.counts.estimatedUnsoldPortions / plan.counts.soldPortions).toBeCloseTo(0.015, 2);
  expect(plan.counts.simulationLossMovements).toBeGreaterThan(0);
  expect(plan.sales.every((sale) => sale.operationId === `${sale.productionOperationId}:sale`)).toBe(true);
  expect(new Set(plan.sales.map((sale) => sale.operationId)).size).toBe(plan.sales.length);
  expect(Object.values(plan.yearCoverage).reduce((sum, row) => sum + row.serviceDays, 0)).toBe(plan.counts.serviceDays);
  expect(Object.values(plan.yearCoverage).reduce((sum, row) => sum + row.invoiceReceipts, 0)).toBe(plan.counts.invoiceReceipts);
  expect(plan.yearCoverage).toMatchObject({
    "2023": { documents: 3, invoiceReceipts: 0 },
    "2024": { documents: 57 },
    "2025": { documents: 184 },
    "2026": { documents: 186 },
    "sans-date": { documents: 1 },
  });
  for (const year of ["2024", "2025", "2026"] as const) {
    expect(plan.yearCoverage[year].serviceDays).toBeGreaterThan(0);
    expect(plan.yearCoverage[year].invoiceReceipts).toBeGreaterThan(0);
  }
  expect(plan.counts.invoiceReceipts).toBeGreaterThan(0);
  expect(invoices.filter((invoice) => invoice.type === "invoice")).toHaveLength(415);
  expect(invoices.filter((invoice) => invoice.type === "credit")).toHaveLength(15);
  expect(invoices.filter((invoice) => invoice.type === "delivery")).toHaveLength(1);
});

it("plans the local demo story with effective recipe versions, counted overstock, loss, and a blocked production", () => {
  const products = catalog.products.map((product) => ({ ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit) }));
  const plan = buildRestaurantSimulation(createAnonymizedSourceInvoices(), products, true);
  const tomato = plan.productState.find((product) => product.id === "p1")!;
  const overstock = plan.stockCounts.find((count) => count.operationId.endsWith(":overstock"))!;
  const currentCount = plan.stockCounts.find((count) => count.operationId.endsWith(":current"))!;
  const loss = plan.movements.find((movement) => movement.reason === "loss")!;
  const refusal = plan.productions.find((production) => production.kind === "refusal")!;
  const oldCarbonara = plan.productions.find((production) => production.recipeId === "r3" && production.date < "2025-06-16")!;
  const newCarbonara = plan.productions.find((production) => production.recipeId === "r3" && production.date >= "2025-06-16")!;

  expect(plan.counts).toMatchObject({ stockCounts: 3, overstockCounts: 1, explicitLosses: 1, refusedProductions: 1 });
  expect(overstock.countedQuantity).toBe(60);
  expect(overstock.countedQuantity).toBeGreaterThan(overstock.theoreticalQuantity);
  expect(plan.movements.some((movement) => movement.reason === "stock_count" &&
    movement.stockCountOperationId === overstock.operationId && movement.delta === overstock.delta)).toBe(true);
  expect(loss).toMatchObject({ productId: "p1", delta: -10, at: "2025-06-13T16:00:00.000Z" });
  expect(refusal).toMatchObject({ date: "2025-12-26", portions: 35, recipeVersionSequence: 2 });
  expect(refusal.notes).toContain("stock insuffisant");
  expect(refusal.notes).toContain("Aucune sortie de stock");
  expect(plan.movements.some((movement) => movement.operationId === refusal.operationId)).toBe(false);
  expect(plan.productions.some((production) => production.date === refusal.date && production.kind === "production")).toBe(true);
  expect(oldCarbonara.recipeVersionSequence).toBe(1);
  expect(newCarbonara.recipeVersionSequence).toBe(2);
  expect(plan.recipeVersions.find((version) => version.recipeId === "r3" && version.sequence === 2)?.effectiveFrom).toBe("2025-06-16");
  expect(currentCount.countedQuantity).toBe(tomato.closing);
  expect(currentCount.stockRevisionAfter).toBe(tomato.stockRevision);
  expect(plan.yearCoverage["2025"]).toMatchObject({ stockCounts: 2, overstockCounts: 1, explicitLosses: 1, refusedProductions: 1 });
  expect(Object.values(plan.productState).every((product) => product.closing >= 0)).toBe(true);
});
