import { describe, expect, it } from "vitest";
import { getProductStatus, getSuggestedOrderQuantity } from "./product.policies";
import type { Product } from "./product.types";

const product: Product = {
  id: "p1", name: "Tomates", category: "Légumes", currentStock: 2,
  minThreshold: 3, unit: "kg", supplierId: "s1", pricePerUnit: 2, revision: 1,
};

describe("inventory policies", () => {
  it("treats the minimum threshold as a stock alert", () => {
    expect(getProductStatus({ ...product, currentStock: 3 })).toBe("moderate");
    expect(getProductStatus({ ...product, currentStock: 0 })).toBe("urgent");
  });

  it("suggests a positive, three-decimal order quantity", () => {
    expect(getSuggestedOrderQuantity({ ...product, currentStock: 0.1, minThreshold: 1.101 })).toBe(1.001);
    expect(getSuggestedOrderQuantity({ ...product, currentStock: 4 })).toBe(1);
  });
});
