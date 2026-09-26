import { describe, expect, it } from "vitest";
import type { PurchaseSuggestion, PurchaseSuggestions } from "../../services/orderService";
import { summarizePurchaseForecast } from "./purchaseForecastPresentation";

const item = (productId: string, values: Partial<PurchaseSuggestion> = {}): PurchaseSuggestion => ({
  productId, productName: productId, supplierName: "Primeur", unit: "kg", suggestionKey: productId,
  status: "ready", canAdd: true, forecastNeed: 5, countedStock: 2, countDate: "2026-09-26",
  netNeed: 3, orderStep: 1, estimatedQuantity: 3, currentUnitPrice: 4, estimatedCost: 12, sources: [], reason: "Besoin net", decision: null,
  ...values,
});
const data = (suggestions: PurchaseSuggestion[], values: Partial<PurchaseSuggestions> = {}): PurchaseSuggestions => ({
  status: "ready", provenance: "recorded_sales", workspaceMode: "operational", model: "rolling_mean_7_v1",
  asOfDate: "2026-09-25", forecastDate: "2026-09-26", completeServiceDays: 28,
  blockers: [], assumptions: [], suggestions, ...values,
});

describe("purchase forecast overview", () => {
  it("separates net purchases, covered stock and missing counts without mixing their budgets", () => {
    const result = summarizePurchaseForecast(data([
      item("Tomates"), item("Poulet", { supplierName: "Boucherie", estimatedCost: 30 }),
      item("Farine", { status: "covered", canAdd: false, estimatedQuantity: 0, estimatedCost: 0 }),
      item("Huile", { status: "needs_stock_count", canAdd: false, countedStock: null, estimatedQuantity: null, estimatedCost: null }),
    ]), []);
    expect(result.toReview.map((row) => row.productId)).toEqual(["Poulet", "Tomates"]);
    expect(result.estimatedCost).toBe(42);
    expect(result.supplierCount).toBe(2);
    expect(result.covered.map((row) => row.productId)).toEqual(["Farine"]);
    expect(result.needsCheck.map((row) => row.productId)).toEqual(["Huile"]);
  });

  it("never advertises blocked or ineligible quantities as actionable purchases", () => {
    expect(summarizePurchaseForecast(data([item("Tomates")], { blockers: ["Recette manquante"] }), []).toReview).toEqual([]);
    expect(summarizePurchaseForecast(data([item("Tomates")], { status: "simulation_only" }), []).estimatedCost).toBeNull();
    expect(summarizePurchaseForecast(data([item("Tomates", { canAdd: false })]), []).toReview).toEqual([]);
  });

  it("does not propose a second purchase for items already selected or reviewed", () => {
    const result = summarizePurchaseForecast(data([
      item("Tomates"),
      item("Poulet", { decision: { kind: "added", operationId: "added", quantity: 3, orderId: "order" } }),
      item("Riz", { decision: { kind: "excluded", operationId: "excluded", quantity: null, orderId: null } }),
      item("Pommes"),
    ]), ["Tomates"]);
    expect(result.toReview.map((row) => row.productId)).toEqual(["Pommes"]);
    expect(result.handled).toHaveLength(3);
    expect(result.estimatedCost).toBe(12);
  });

  it("does not display a partial price as a complete budget", () => {
    expect(summarizePurchaseForecast(data([item("Tomates"), item("Riz", { estimatedCost: null })]), []).estimatedCost).toBeNull();
  });
});
