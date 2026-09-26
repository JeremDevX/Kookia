import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecipeSuggestionPanel from "./RecipeSuggestionPanel";
import type { RecipeSuggestion } from "../../domain/recipes/recipeSuggestionPolicy";
import { suggestRecipeFromIncomingProduct } from "../../domain/recipes/recipeSuggestionPolicy";

const suggestion: RecipeSuggestion = {
  sourceProductId: "tomato", sourceProductName: "Tomates",
  sourceReceipt: { receiptLineId: "receipt-line", reference: "BL-2026-01", receivedQuantity: 8, unit: "kg" },
  effectiveFrom: "2026-06-01", name: "Salade de tomates", category: "Entrée", prepTime: 15, yieldPortions: 4,
  ingredients: [{ productId: "tomato", productName: "Tomates", unit: "kg", quantity: 0.6 },
    { productId: "oil", productName: "Huile", unit: "L", quantity: 0.04 }],
};

describe("RecipeSuggestionPanel", () => {
  it("renders the conditional sales/loss estimate and its recipe basis", () => {
    const html = renderToStaticMarkup(createElement(RecipeSuggestionPanel, { suggestion, onReview: () => undefined }));

    expect(html).toContain("Sorties estimées sous cette proposition");
    expect(html).toContain("Ventes estimées");
    expect(html).toContain("7,2 kg");
    expect(html).toContain("Pertes estimées");
    expect(html).toContain("0,8 kg");
    expect(html).toContain("cette projection n’est pas une vente");
    expect(html).toContain("autres ingrédients ne sont pas réputés disponibles");
    expect(html).not.toMatch(/fictif|inventé|histoire/i);
  });

  it("shows estimated outflows for an incoming seasoning matched to a catalog recipe ingredient", () => {
    const oil = { id: "oil", name: "Huile d’olive", category: "Épicerie", unit: "L" } as const;
    const tomatoes = { id: "tomatoes", name: "Tomates", category: "Légumes", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(oil, [oil, tomatoes], "2026-06-01",
      { receiptLineId: "oil-receipt", reference: "BL-2026-06", receivedQuantity: 2, unit: "L" });

    expect(suggestion).not.toBeNull();
    const html = renderToStaticMarkup(createElement(RecipeSuggestionPanel, { suggestion: suggestion!, onReview: () => undefined }));

    expect(html).toContain("1,8 L");
    expect(html).toContain("0,2 L");
    expect(html).toContain("la recette en prévoit 4 par lot");
  });

  it("shows conditional outflows for incoming cream paired with available potatoes", () => {
    const cream = { id: "cream", name: "Crème fraîche", category: "Frais", unit: "L" } as const;
    const potatoes = { id: "potatoes", name: "Pommes de terre", category: "Légumes", unit: "kg" } as const;
    const candidate = suggestRecipeFromIncomingProduct(cream, [cream, potatoes], "2026-06-01",
      { receiptLineId: "cream-receipt", reference: "BL-2026-06", receivedQuantity: 2, unit: "L" });
    expect(candidate).not.toBeNull();
    const html = renderToStaticMarkup(createElement(RecipeSuggestionPanel, { suggestion: candidate!, onReview: () => undefined }));

    expect(html).toContain("Gratin de pommes de terre à la crème");
    expect(html).toContain("correspond théoriquement à 40 portions");
    expect(html).toContain("Ventes estimées (90 %) : 1,8 L");
    expect(html).toContain("Pertes estimées (10 %) : 0,2 L");
    expect(html).not.toMatch(/fictif|inventé|histoire/i);
  });

  it("omits the conditional outflow estimate when there is no received source", () => {
    const html = renderToStaticMarkup(createElement(RecipeSuggestionPanel, {
      suggestion: { ...suggestion, sourceReceipt: undefined }, onReview: () => undefined,
    }));

    expect(html).not.toContain("Sorties estimées sous cette proposition");
  });
});
