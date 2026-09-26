import { describe, expect, it } from "vitest";
import { estimateIncomingRecipeSuggestion, estimateSuggestedRecipeOutflow } from "./recipeSuggestionOutflowPolicy";
import type { RecipeSuggestion } from "./recipeSuggestionPolicy";

const suggestion: RecipeSuggestion = {
  sourceProductId: "tomato", sourceProductName: "Tomates",
  sourceReceipt: { receiptLineId: "receipt-line", reference: "BL-2026-01", receivedQuantity: 8, unit: "kg" },
  effectiveFrom: "2026-06-01", name: "Salade de tomates", category: "Entrée", prepTime: 15, yieldPortions: 4,
  ingredients: [{ productId: "tomato", productName: "Tomates", unit: "kg", quantity: 0.6 },
    { productId: "oil", productName: "Huile", unit: "L", quantity: 0.04 }],
};

describe("estimateSuggestedRecipeOutflow", () => {
  it("calculates a conditional estimate from the received ingredient dosage and recipe yield", () => {
    expect(estimateSuggestedRecipeOutflow(suggestion)).toEqual({ unit: "kg", receivedQuantity: 8,
      estimatedSalesShare: 0.9, estimatedLossShare: 0.1, possiblePortions: 53.333,
      estimatedSoldPortions: 48, estimatedLossPortions: 5.333,
      estimatedSoldQuantity: 7.2, estimatedLossQuantity: 0.8 });
  });

  it("does not estimate without a receipt, a matching source ingredient, or compatible units", () => {
    expect(estimateSuggestedRecipeOutflow({ ...suggestion, sourceReceipt: undefined })).toBeNull();
    expect(estimateSuggestedRecipeOutflow({ ...suggestion,
      ingredients: suggestion.ingredients.filter((ingredient) => ingredient.productId !== "tomato") })).toBeNull();
    expect(estimateSuggestedRecipeOutflow({ ...suggestion, ingredients: suggestion.ingredients.map((ingredient) =>
      ingredient.productId === "tomato" ? { ...ingredient, unit: "L" } : ingredient) })).toBeNull();
  });

  it("rejects zero or invalid recipe quantities and yields", () => {
    expect(estimateSuggestedRecipeOutflow({ ...suggestion, yieldPortions: 0 })).toBeNull();
    expect(estimateSuggestedRecipeOutflow({ ...suggestion, ingredients: suggestion.ingredients.map((ingredient) =>
      ingredient.productId === "tomato" ? { ...ingredient, quantity: 0 } : ingredient) })).toBeNull();
    expect(estimateSuggestedRecipeOutflow({ ...suggestion, sourceReceipt: { ...suggestion.sourceReceipt!, receivedQuantity: 0 } }))
      .toBeNull();
  });

  it("keeps rounded conditional sales and loss estimates within the received quantity and portions", () => {
    const smallSuggestion = { ...suggestion, yieldPortions: 1,
      sourceReceipt: { ...suggestion.sourceReceipt!, receivedQuantity: 0.005 },
      ingredients: suggestion.ingredients.map((ingredient) => ingredient.productId === "tomato"
        ? { ...ingredient, quantity: 0.005 } : ingredient) };
    const estimate = estimateSuggestedRecipeOutflow(smallSuggestion);

    expect(estimate!.estimatedSoldQuantity + estimate!.estimatedLossQuantity).toBe(0.005);
    expect(estimate!.estimatedSoldPortions + estimate!.estimatedLossPortions).toBe(estimate!.possiblePortions);
  });
});

describe("estimateIncomingRecipeSuggestion", () => {
  it("pairs an incoming receipt with a compatible catalog recipe candidate and conditional outflow", () => {
    const tomatoes = { id: "tomato", name: "Tomates", category: "Légumes", unit: "kg" as const };
    const oil = { id: "oil", name: "Huile", category: "Épicerie", unit: "L" as const };
    const result = estimateIncomingRecipeSuggestion(tomatoes, [tomatoes, oil], "2026-06-01", {
      receiptLineId: "tomato-line", reference: "BL-2026-01", receivedQuantity: 8, unit: "kg",
    });

    expect(result).toMatchObject({ suggestion: { name: "Salade de tomates", sourceReceipt: { receiptLineId: "tomato-line" } },
      estimate: { receivedQuantity: 8, possiblePortions: 53.333, estimatedSoldQuantity: 7.2, estimatedLossQuantity: 0.8 } });
  });

  it("leaves products without a credible recipe candidate uncovered", () => {
    const cleaningProduct = { id: "cleaner", name: "Nettoyant", category: "Entretien", unit: "L" as const };
    expect(estimateIncomingRecipeSuggestion(cleaningProduct, [cleaningProduct], "2026-06-01", {
      receiptLineId: "cleaner-line", reference: "BL-2026-02", receivedQuantity: 2, unit: "L",
    })).toBeNull();
  });
});
