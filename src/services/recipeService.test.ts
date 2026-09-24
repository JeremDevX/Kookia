import { describe, expect, it } from "vitest";
import type { Product, Recipe } from "../types";
import { calculateIngredientCost, calculateMaxYield } from "./recipeService";

const products: Product[] = [
  { id: "p1", name: "Tomates", category: "Légumes", currentStock: 12, unit: "kg", minThreshold: 20, supplierId: "supplier", pricePerUnit: 2.4, revision: 1, stockRevision: 1 },
  { id: "p2", name: "Mozzarella", category: "Fromages", currentStock: 8, unit: "kg", minThreshold: 10, supplierId: "supplier", pricePerUnit: 8.5, revision: 1, stockRevision: 1 },
];
const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({ id: "r1", name: "Test", category: "Plat",
  prepTime: 10, yieldPortions: 1, revision: 1, version: 1, effectiveFrom: null, ingredients: [], versions: [], ...overrides });
const ingredient = (productId: string, quantity: number) => ({ productId, productName: productId, unit: "kg", quantity });

describe("recipeService", () => {
  it("returns 0 max yield when recipe has no ingredient", () => {
    expect(calculateMaxYield(makeRecipe(), products)).toBe(0);
  });

  it("calculates max yield based on limiting ingredient", () => {
    expect(calculateMaxYield(makeRecipe({ ingredients: [ingredient("p1", 3), ingredient("p2", 2)] }), products)).toBe(4);
  });

  it("limits piece-based production to whole-piece portion increments", () => {
    const recipe = makeRecipe({ yieldPortions: 3, ingredients: [ingredient("eggs", 2)] });
    const stock: Product[] = [{ ...products[0], id: "eggs", unit: "pcs", currentStock: 5 }];
    expect(calculateMaxYield(recipe, stock)).toBe(6);
    expect(calculateMaxYield(makeRecipe({ yieldPortions: 3, ingredients: [ingredient("eggs", 2)] }),
      [{ ...stock[0], currentStock: 1 }])).toBe(0);
  });

  it("matches persisted three-decimal stock arithmetic at a portion boundary", () => {
    expect(calculateMaxYield(makeRecipe({ ingredients: [ingredient("p1", 0.1)] }), [{ ...products[0], currentStock: 0.3 }])).toBe(3);
  });

  it("scales stock and ingredient cost by the batch yield", () => {
    const recipe = makeRecipe({ yieldPortions: 4, ingredients: [ingredient("p1", 0.8), ingredient("p2", 0.4)] });
    expect(calculateMaxYield(recipe, products)).toBe(60);
    expect(calculateIngredientCost(recipe, products)).toBeCloseTo(1.33, 5);
  });

  it("calculates ingredient cost when all prices are known", () => {
    const recipe = makeRecipe({ ingredients: [ingredient("p1", 2), ingredient("p2", 1)] });
    expect(calculateIngredientCost(recipe, products)).toBeCloseTo(13.3, 5);
  });

  it("does not present a partial cost as the complete recipe cost", () => {
    const recipe = makeRecipe({ ingredients: [ingredient("p1", 2), ingredient("unknown", 5)] });
    expect(calculateIngredientCost(recipe, products)).toBeNull();
  });
});
