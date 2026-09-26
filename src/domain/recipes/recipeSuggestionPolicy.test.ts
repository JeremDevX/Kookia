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

  it("does not confuse beef with eggs and pairs it with an available side", () => {
    const beef = { id: "beef", name: "Bœuf haché", category: "Viande", unit: "kg" } as const;
    const potatoes = { id: "potatoes", name: "Pommes de terre", category: "Légumes", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(beef, [beef, potatoes], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Bœuf haché et pommes de terre", ingredients: [
      { productId: "beef", quantity: 0.6, unit: "kg" }, { productId: "potatoes", quantity: 0.8, unit: "kg" },
    ] });
    expect(suggestion?.name).not.toContain("Omelette");
  });

  it("proposes a compatible potato recipe for incoming cream when pasta ingredients are absent", () => {
    const cream = { id: "cream", name: "Crème fraîche", category: "Frais", unit: "L" } as const;
    const potatoes = { id: "potatoes", name: "Pommes de terre", category: "Légumes", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(cream, [cream, potatoes], "2026-06-01",
      { receiptLineId: "cream-receipt", reference: "BL-2026-06", receivedQuantity: 2, unit: "L" });

    expect(suggestion).toMatchObject({ name: "Gratin de pommes de terre à la crème",
      sourceReceipt: { receiptLineId: "cream-receipt", receivedQuantity: 2, unit: "L" }, ingredients: [
        { productId: "potatoes", quantity: 0.8, unit: "kg" }, { productId: "cream", quantity: 0.2, unit: "L" },
      ] });
  });

  it("pairs incoming mushrooms with catalog pasta and cream", () => {
    const mushrooms = { id: "mushrooms", name: "Champignons", category: "Légumes", unit: "kg" } as const;
    const pasta = { id: "pasta", name: "Pâtes", category: "Féculents", unit: "kg" } as const;
    const cream = { id: "cream", name: "Crème fraîche", category: "Frais", unit: "L" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(mushrooms, [mushrooms, pasta, cream], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Pâtes aux champignons", ingredients: [
      { productId: "mushrooms", quantity: 0.4, unit: "kg" }, { productId: "pasta", quantity: 0.4, unit: "kg" },
      { productId: "cream", quantity: 0.2, unit: "L" },
    ] });
  });

  it("pairs incoming pasta with catalog mushrooms and cream", () => {
    const pasta = { id: "pasta", name: "Pâtes", category: "Féculents", unit: "kg" } as const;
    const mushrooms = { id: "mushrooms", name: "Champignons", category: "Légumes", unit: "kg" } as const;
    const cream = { id: "cream", name: "Crème fraîche", category: "Frais", unit: "L" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(pasta, [pasta, mushrooms, cream], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Pâtes aux champignons", ingredients: [
      { productId: "mushrooms", quantity: 0.4, unit: "kg" }, { productId: "pasta", quantity: 0.4, unit: "kg" },
      { productId: "cream", quantity: 0.2, unit: "L" },
    ] });
  });

  it("pairs incoming cream with catalog mushrooms and pasta", () => {
    const cream = { id: "cream", name: "Crème fraîche", category: "Frais", unit: "L" } as const;
    const mushrooms = { id: "mushrooms", name: "Champignons", category: "Légumes", unit: "kg" } as const;
    const pasta = { id: "pasta", name: "Pâtes", category: "Féculents", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(cream, [cream, mushrooms, pasta], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Pâtes aux champignons", ingredients: [
      { productId: "mushrooms", quantity: 0.4, unit: "kg" }, { productId: "pasta", quantity: 0.4, unit: "kg" },
      { productId: "cream", quantity: 0.2, unit: "L" },
    ] });
  });

  it("suggests a rice preparation from a received starch even when it is catalogued as grocery", () => {
    const rice = { id: "rice", name: "Riz", category: "Épicerie", unit: "kg" } as const;
    const chicken = { id: "chicken", name: "Poulet", category: "Volaille", unit: "kg" } as const;
    const carrots = { id: "carrots", name: "Carottes", category: "Légumes", unit: "kg" } as const;
    const suggestion = suggestRecipeFromIncomingProduct(rice, [rice, chicken, carrots, oil], "2026-06-01");

    expect(suggestion).toMatchObject({ name: "Riz au poulet et aux légumes", ingredients: [
      { productId: "rice", quantity: 0.4, unit: "kg" }, { productId: "chicken", quantity: 0.5, unit: "kg" },
      { productId: "carrots", quantity: 0.4, unit: "kg" }, { productId: "oil", quantity: 0.04, unit: "L" },
    ] });
  });

  it("uses a compatible catalog ingredient for a seasoning receipt without assuming its stock is available", () => {
    const suggestion = suggestRecipeFromIncomingProduct(oil, [oil, tomato], "2026-06-01",
      { receiptLineId: "oil-receipt", reference: "BL-2026-06", receivedQuantity: 2, unit: "L" });

    expect(suggestion).toMatchObject({ sourceProductId: "oil", name: "Salade de tomates assaisonnée",
      sourceReceipt: { receiptLineId: "oil-receipt", receivedQuantity: 2, unit: "L" },
      ingredients: [{ productId: "tomato", quantity: 0.6, unit: "kg" }, { productId: "oil", quantity: 0.04, unit: "L" }] });
  });

  it("uses compatible dosage units for herbs, spices, and vinegar", () => {
    const cases = [
      { product: { id: "basil", name: "Basilic", category: "Frais", unit: "kg" }, quantity: 0.012 },
      { product: { id: "paprika", name: "Paprika", category: "Épicerie", unit: "kg" }, quantity: 0.008 },
      { product: { id: "vinegar", name: "Vinaigre", category: "Épicerie", unit: "L" }, quantity: 0.02 },
    ] as const;

    for (const { product, quantity } of cases) {
      const suggestion = suggestRecipeFromIncomingProduct(product, [product, tomato], "2026-06-01");
      expect(suggestion?.ingredients.find((ingredient) => ingredient.productId === product.id)?.quantity).toBe(quantity);
    }
  });

  it("does not turn non-food or unsupported standalone seasoning inputs into a dish suggestion", () => {
    const cleanser = { id: "cleanser", name: "Nettoyant cuisine", category: "Entretien", unit: "L" } as const;
    const oilOnly = { id: "oil", name: "Huile d’olive", category: "Épicerie", unit: "L" } as const;

    expect(suggestRecipeFromIncomingProduct(cleanser, [cleanser, tomato], "2026-06-01")).toBeNull();
    expect(suggestRecipeFromIncomingProduct(oilOnly, [oilOnly], "2026-06-01")).toBeNull();
  });
});
