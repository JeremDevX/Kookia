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
  expect(plan.sourceDigest).toBe(replay.sourceDigest);
  expect(plan.movements).toEqual(replay.movements);
  expect(plan.counts.serviceDays).toBeGreaterThan(900);
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
