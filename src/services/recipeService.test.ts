import { describe, expect, it } from "vitest";
import type { Recipe } from "../types";
import { MOCK_PRODUCTS } from "../data/mock/inventory";
import { calculateIngredientCost, calculateMaxYield } from "./recipeService";

describe("recipeService", () => {
  it("returns 0 max yield when recipe has no ingredient", () => {
    const recipe: Recipe = {
      id: "r-empty",
      name: "Empty",
      category: "Plat",
      prepTime: 10,
      ingredients: [],
    };

    expect(calculateMaxYield(recipe, MOCK_PRODUCTS)).toBe(0);
  });

  it("calculates max yield based on limiting ingredient", () => {
    const recipe: Recipe = {
      id: "r-1",
      name: "Test",
      category: "Plat",
      prepTime: 20,
      ingredients: [
        { productId: "p1", quantity: 3 },
        { productId: "p2", quantity: 2 },
      ],
    };

    expect(calculateMaxYield(recipe, MOCK_PRODUCTS)).toBe(4);
  });

  it("calculates ingredient cost from known products only", () => {
    const total = calculateIngredientCost([
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
      { productId: "unknown", quantity: 5 },
    ], MOCK_PRODUCTS);

    expect(total).toBeCloseTo(13.3, 5);
  });
});
