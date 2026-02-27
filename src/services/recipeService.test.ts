import { describe, expect, it } from "vitest";
import type { Recipe } from "../types";
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

    expect(calculateMaxYield(recipe)).toBe(0);
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

    expect(calculateMaxYield(recipe)).toBe(4);
  });

  it("calculates ingredient cost from known products only", () => {
    const total = calculateIngredientCost([
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
      { productId: "unknown", quantity: 5 },
    ]);

    expect(total).toBeCloseTo(13.3, 5);
  });
});
