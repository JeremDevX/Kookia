import { describe, expect, it } from "vitest";
import { estimateIngredientOutflows, type DatedRecipeVersion, type ReceivedIngredient } from "./ingredientOutflowEstimatePolicy.js";

const receipt: ReceivedIngredient = { id: "line-1", receiptId: "receipt-1", receiptReference: "BL-2026-1",
  deliveryDate: "2026-04-10", productId: "tomato", productName: "Tomate", unit: "kg", receivedQuantity: 10 };
const recipe = (version: number, effectiveFrom: string, quantity: number, name = "Pâtes tomate"): DatedRecipeVersion => ({
  recipeId: "recipe-1", recipeName: name, version, effectiveFrom, yieldPortions: 4,
  ingredients: [{ productId: "tomato", productName: "Tomate", unit: "kg", quantity },
    { productId: "pasta", productName: "Pâtes", unit: "kg", quantity: 1 }],
});

describe("ingredient outflow estimate policy", () => {
  it("uses the latest effective recipe version and keeps sales/loss estimates separate", () => {
    const result = estimateIngredientOutflows([receipt], [recipe(1, "2026-01-01", 2), recipe(2, "2026-04-01", 4),
      recipe(3, "2026-05-01", 8)]);
    expect(result.estimates).toHaveLength(1);
    expect(result.estimates[0]).toMatchObject({ receiptId: "receipt-1", recipeVersion: 2, recipeIngredientQuantity: 4,
      possiblePortions: 10, estimatedSoldPortions: 9,
      estimatedLossPortions: 1, estimatedSoldQuantity: 9, estimatedLossQuantity: 1, otherIngredientCount: 1 });
    expect(result.unestimatedReceipts).toEqual([]);
  });

  it("keeps compatible recipes as alternatives and ignores incompatible units or undated recipes", () => {
    const alternatives = { ...recipe(1, "2026-01-01", 4, "Soupe tomate"), recipeId: "recipe-2" };
    const incompatible = { ...recipe(1, "2026-01-01", 2, "Sauce en litres"), recipeId: "recipe-3",
      ingredients: [{ productId: "tomato", productName: "Tomate", unit: "L", quantity: 2 }] };
    const future = { ...recipe(1, "2026-05-01", 2, "Future recipe"), recipeId: "recipe-4" };
    const result = estimateIngredientOutflows([receipt], [recipe(1, "2026-01-01", 2), alternatives, incompatible, future]);
    expect(result.estimates).toHaveLength(2);
    expect(result.unestimatedReceipts).toEqual([]);
  });

  it("returns an explicit coverage gap when no dated recipe matches the received ingredient and unit", () => {
    const incompatible = { ...recipe(1, "2026-01-01", 2, "Sauce en litres"), recipeId: "recipe-3",
      ingredients: [{ productId: "tomato", productName: "Tomate", unit: "L", quantity: 2 }] };
    const future = { ...recipe(1, "2026-05-01", 2, "Future recipe"), recipeId: "recipe-4" };
    const result = estimateIngredientOutflows([receipt], [incompatible, future]);
    expect(result.estimates).toEqual([]);
    expect(result.unestimatedReceipts).toEqual([{ ...receipt, reason: "no_dated_compatible_recipe" }]);
  });

  it("keeps rounded sales and loss estimates within the received quantity and possible portions", () => {
    const smallReceipt = { ...receipt, receivedQuantity: 0.005 };
    const smallRecipe = { ...recipe(1, "2026-01-01", 0.005), yieldPortions: 1 };
    const estimate = estimateIngredientOutflows([smallReceipt], [smallRecipe]).estimates[0];

    expect(estimate.estimatedSoldQuantity + estimate.estimatedLossQuantity).toBe(0.005);
    expect(estimate.estimatedSoldPortions + estimate.estimatedLossPortions).toBe(estimate.possiblePortions);
  });
});
