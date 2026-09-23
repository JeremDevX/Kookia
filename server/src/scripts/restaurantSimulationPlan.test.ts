import { expect, it } from "vitest";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { buildRestaurantSimulation } from "./restaurantSimulationPlan.js";
import { readSourceInvoices } from "./sourceInvoices.js";

it("builds a complete, deterministic multi-year service and inventory ledger", () => {
  const products = catalog.products.map((product) => ({ ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit) }));
  const plan = buildRestaurantSimulation(readSourceInvoices(), products);
  expect(plan.counts.invoiceDocuments).toBe(431);
  expect(plan.counts.serviceDays).toBeGreaterThan(900);
  expect(plan.sales).toHaveLength(plan.productions.length);
  expect(plan.sales.every((sale) => sale.portionsPrepared === sale.quantity + sale.estimatedUnsold)).toBe(true);
  expect(plan.counts.estimatedUnsoldPortions / plan.counts.soldPortions).toBeCloseTo(0.015, 2);
  expect(plan.counts.simulationLossMovements).toBeGreaterThan(0);
  expect(plan.sales.every((sale) => sale.operationId === `${sale.productionOperationId}:sale`)).toBe(true);
  expect(new Set(plan.sales.map((sale) => sale.operationId)).size).toBe(plan.sales.length);
  expect(Object.values(plan.yearCoverage).reduce((sum, row) => sum + row.serviceDays, 0)).toBe(plan.counts.serviceDays);
  expect(Object.values(plan.yearCoverage).reduce((sum, row) => sum + row.invoiceReceipts, 0)).toBe(plan.counts.invoiceReceipts);
});
