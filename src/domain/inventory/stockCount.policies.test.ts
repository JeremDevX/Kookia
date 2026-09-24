import { describe, expect, it } from "vitest";
import type { Product } from "./product.types";
import { getStockVerificationStatus } from "./stockCount.policies";

const product: Product = {
  id: "p1", name: "Tomates", category: "Légumes", currentStock: 5, unit: "kg", minThreshold: 1,
  supplierId: "s1", pricePerUnit: 2, revision: 1, stockRevision: 2,
};

describe("stock verification", () => {
  it("does not treat an uncounted theoretical balance as verified", () => {
    expect(getStockVerificationStatus(product)).toBe("to_verify");
  });

  it("accepts a zero-variance count and marks changed stock for review", () => {
    const latestCount = { id: "c1", productId: "p1", countedQuantity: 5, theoreticalQuantity: 5, delta: 0,
      unit: "kg" as const, stockRevisionBefore: 2, stockRevisionAfter: 2, operationId: "op1", actorId: "u1",
      countDate: "2026-09-24", countedAt: "2026-09-24T09:00:00.000Z" };
    expect(getStockVerificationStatus({ ...product, stockRevision: 2, latestCount })).toBe("counted");
    expect(getStockVerificationStatus({ ...product, stockRevision: 3, latestCount })).toBe("to_verify");
  });
});
