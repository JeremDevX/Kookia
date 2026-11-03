import { it, expect, vi } from "vitest";
vi.mock("./salesBaselineService.js", () => ({ getSalesBaseline: async () => ({ completeServiceDays: 28 }) }));
vi.mock("./operationalForecastService.js", () => ({ getOperationalForecast: async () => ({ blockers: [], provenance: "recorded_sales", ingredientNeeds: [{ productId: "p", unit: "kg", quantity: 10, sources: [] }], services: [], throughDate: "2026-11-03" }) }));
import { getPurchaseSuggestions as current } from "./purchaseSuggestionService.js";
it("preserves pre-opening-days keys for unchanged supplier horizons", async () => {
 const product = { id: "p", supplierId: "s", name: "Product", category: "x", unit: "kg", stockRevision: 0, currentStock: 0, pricePerUnit: 1, orderPackQuantity: 1, supplier: { name: "Supplier", deliveryWeekdays: [0,1,2,3,4,5,6], leadTimeDays: 0, orderCutoffTime: "23:59" } };
 const db = { restaurant: { findUnique: async () => ({ mode: "operational", openingWeekdays: null }) }, product: { findMany: async () => [product] }, stockCount: { findMany: async () => [] }, purchaseOrderLine: { findMany: async () => [] }, stockLot: { findMany: async () => [] }, recommendationDecision: { findMany: async () => [] } } as unknown as Parameters<typeof current>[1];
 const date = new Date("2026-11-03T08:00:00Z");
 // SHA-256 values produced by commit 565bb6f^ with this fixed fixture.
 for (const [lead, expected] of [[0, "a724608d5d703c5cdf1a5f3f839682c9830f2ed4ea8fae8155d2b2d762beb316"], [null, "3771f5f256dcb24e533ca8ac48224bdda492d234bc6577b05f694116e784ba3f"]] as const) {
  product.supplier.leadTimeDays = lead as number;
  const after = (await current("r", db, date)).suggestions[0].suggestionKey;
  expect(after).toBe(expected);
 }
});
