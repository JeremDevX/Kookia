import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProductionConfirmModal from "./ProductionConfirmModal";
import { productionIngredientAmount } from "../../domain/recipes/productionIngredientAmount";
import type { Recipe } from "../../types";

const recipe: Recipe = { id: "r", name: "Test", category: "Plat", prepTime: 10, yieldPortions: 4,
  revision: 1, version: 1, effectiveFrom: null, versions: [], ingredients: [
    { productId: "p", productName: "Tomate", unit: "kg", quantity: 1 },
  ] };

describe("production ingredient amounts", () => {
  it("scales quantities and rounds half up to stock precision", () => {
    expect(productionIngredientAmount(1, 2, 4, "kg")).toBe(0.5);
    expect(productionIngredientAmount(0.001, 1, 2, "kg")).toBe(0.001);
    expect(productionIngredientAmount(0.001, 1, 3, "kg")).toBeNull();
  });
  it("rejects fractional pieces", () => {
    expect(productionIngredientAmount(2, 1, 3, "pcs")).toBeNull();
    expect(productionIngredientAmount(2, 3, 3, "pcs")).toBe(2);
  });
  it("displays the amount for the selected initial portions", () => {
    const html = renderToStaticMarkup(createElement(ProductionConfirmModal, { isOpen: true, onClose: () => {}, recipe,
      maxYield: 10, initialPortions: 2, costPerPortion: null, getProductName: () => "", getProductUnit: () => "", onConfirm: async () => {} }));
    expect(html).toContain("Ingrédients à déduire");
    expect(html).toContain("0.5 kg");
    expect(html).not.toContain("pour le lot");
    expect(html).toContain('for="production-quantity"');
  });
  it("links a precision error to the quantity field and disables confirmation", () => {
    const html = renderToStaticMarkup(createElement(ProductionConfirmModal, { isOpen: true, onClose: () => {},
      recipe: { ...recipe, yieldPortions: 3, ingredients: [{ ...recipe.ingredients[0], unit: "pcs", quantity: 2 }] },
      maxYield: 3, costPerPortion: null, getProductName: () => "", getProductUnit: () => "", onConfirm: async () => {} }));
    expect(html).toContain('aria-describedby="production-quantity-error"');
    expect(html).toContain('role="alert"');
    expect(html).toMatch(/disabled=""[^>]*>Confirmer/);
  });
});
