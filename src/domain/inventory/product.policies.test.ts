import { describe, expect, it } from "vitest";
import { getProductStatus, getProductStatusLabel, getSuggestedOrderQuantity, needsStockReview } from "./product.policies";
import type { Product } from "./product.types";

const product: Product = {
  id: "p1", name: "Tomates", category: "Légumes", currentStock: 2,
  minThreshold: 3, unit: "kg", supplierId: "s1", pricePerUnit: 2, revision: 1, stockRevision: 1,
};

describe("inventory policies", () => {
  const withFreshCount = (currentStock: number): Product => ({
    ...product,
    currentStock,
    latestCount: {
      id: "count-1", productId: product.id, countedQuantity: currentStock,
      theoreticalQuantity: currentStock, delta: 0, unit: product.unit,
      stockRevisionBefore: 0, stockRevisionAfter: product.stockRevision,
      operationId: "operation-1", actorId: "actor-1", countDate: "2026-09-24",
      countedAt: "2026-09-24T12:00:00.000Z",
    },
  });

  it("does not label theoretical stock as urgent before a current count", () => {
    expect(getProductStatus({ ...product, currentStock: 0 })).toBe("neutral");
    expect(getProductStatus({ ...withFreshCount(0), stockRevision: 2 })).toBe("neutral");
    expect(getProductStatusLabel("neutral")).toBe("À vérifier");
  });

  it("uses a current count to distinguish a threshold warning from a stockout", () => {
    expect(getProductStatus(withFreshCount(3))).toBe("moderate");
    expect(getProductStatus(withFreshCount(1))).toBe("moderate");
    expect(getProductStatus(withFreshCount(0))).toBe("urgent");
    expect(getProductStatusLabel("urgent")).toBe("Rupture confirmée");
  });

  it("reviews theoretical low stock without treating every uncounted product as an order need", () => {
    expect(needsStockReview({ ...product, currentStock: 2 })).toBe(true);
    expect(needsStockReview({ ...product, currentStock: 4 })).toBe(false);
    expect(needsStockReview(withFreshCount(1))).toBe(true);
    expect(needsStockReview(withFreshCount(5))).toBe(false);
  });

  it("suggests a positive, three-decimal order quantity", () => {
    expect(getSuggestedOrderQuantity({ ...product, currentStock: 0.1, minThreshold: 1.101 })).toBe(1.001);
    expect(getSuggestedOrderQuantity({ ...product, currentStock: 4 })).toBe(1);
  });
});
