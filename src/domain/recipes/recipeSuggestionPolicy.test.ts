import { describe, expect, it } from "vitest";
import { suggestRecipeFromIncomingProduct } from "./recipeSuggestionPolicy";

const tomato = { id: "tomato", name: "Tomates", category: "Légumes", unit: "kg" } as const;
const mozzarella = { id: "mozzarella", name: "Mozzarella", category: "Fromages", unit: "kg" } as const;
const oil = { id: "oil", name: "Huile d’olive", category: "Épicerie", unit: "L" } as const;
const basil = { id: "basil", name: "Basilic", category: "Frais", unit: "kg" } as const;

describe("suggestRecipeFromIncomingProduct", () => {
  it("proposes a date-bound tomato recipe using only products in the workspace", () => {
    const suggestion = suggestRecipeFromIncomingProduct(tomato, [tomato, mozzarella, oil, basil], "2026-06-01",
      { receiptLineId: "receipt-line", reference: "BL-2026-06", receivedQuantity: 8, unit: "kg" });

    expect(suggestion).toMatchObject({ name: "Salade de tomates et mozzarella", category: "Entrée",
      sourceReceipt: { receiptLineId: "receipt-line", reference: "BL-2026-06", receivedQuantity: 8, unit: "kg" },
      effectiveFrom: "2026-06-01", yieldPortions: 4, ingredients: [
        { productId: "tomato", quantity: 0.6, unit: "kg" },
        { productId: "mozzarella", quantity: 0.5, unit: "kg" },
        { productId: "oil", quantity: 0.04, unit: "L" },
        { productId: "basil", quantity: 0.012, unit: "kg" },
      ] });
  });

  it("keeps counted egg quantities whole and uses a compatible filling when available", () => {
    const eggs = { id: "eggs", name: "Œufs", category: "Frais", unit: "pcs" } as const;
    const mushrooms = { id: "mushrooms", name: "Champignons", category: "Légumes", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(eggs, [eggs, mushrooms], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Omelette aux champignons", ingredients: [
      { productId: "eggs", quantity: 4, unit: "pcs" }, { productId: "mushrooms", quantity: 0.12, unit: "kg" },
    ] });
  });

  it("does not turn non-food or standalone seasoning inputs into a dish suggestion", () => {
    const cleanser = { id: "cleanser", name: "Nettoyant cuisine", category: "Entretien", unit: "L" } as const;
    const oilOnly = { id: "oil", name: "Huile d’olive", category: "Épicerie", unit: "L" } as const;

    expect(suggestRecipeFromIncomingProduct(cleanser, [cleanser, tomato], "2026-06-01")).toBeNull();
    expect(suggestRecipeFromIncomingProduct(oilOnly, [oilOnly, tomato], "2026-06-01")).toBeNull();
  });
});
