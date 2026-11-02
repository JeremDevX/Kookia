import { Children, isValidElement, useEffect, useState, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe } from "../../services/recipeService";
import RecipeEditor from "./RecipeEditor";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [typeof initial === "function" ? initial() : initial, vi.fn()]),
  useEffect: vi.fn(),
}));
vi.mock("../../services/recipeService", () => ({ createRecipe: vi.fn(), updateRecipe: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("requestAnimationFrame", vi.fn()); });
describe("préremplissage CSV", () => {
  it("place les ingrédients dans l’éditeur sans enregistrer de recette", () => {
    const ingredients = [{ productId: "p1", quantity: 1.25 }];
    RecipeEditor({ open: true, recipe: null, products: [], headingRef: { current: null }, initialSuggestion: null,
      initialImport: ingredients, onClose: vi.fn(), onSaved: vi.fn() });
    vi.mocked(useEffect).mock.calls[0][0]();
    const setDraft = vi.mocked(useState).mock.results[0].value[1];
    expect(setDraft).toHaveBeenCalledWith(expect.objectContaining({ name: "", ingredients }));
    expect(createRecipe).not.toHaveBeenCalled();
  });
  it("efface la quantité nette quand le produit change", () => {
    const draft = { name: "Test", category: "Plat", prepTime: 1, yieldPortions: 1, effectiveFrom: "2026-01-01",
      ingredients: [{ productId: "p1", quantity: 2, netQuantity: 1 }] };
    vi.mocked(useState).mockImplementationOnce(() => [draft, vi.fn()] as never);
    const tree = RecipeEditor({ open: true, recipe: null, products: [{ id: "p1", name: "A", unit: "kg" },
      { id: "p2", name: "B", unit: "kg" }] as never, headingRef: { current: null }, initialSuggestion: null,
      onClose: vi.fn(), onSaved: vi.fn() });
    const findSelect = (node: unknown): ReactElement<{ onChange: (event: unknown) => void }> | undefined => {
      if (!isValidElement<{ children?: unknown; value?: unknown }>(node)) return;
      if (node.type === "select" && node.props.value === "p1") return node as ReactElement<{ onChange: (event: unknown) => void }>;
      for (const child of Children.toArray(node.props.children as never)) { const found = findSelect(child); if (found) return found; }
    };
    findSelect(tree)!.props.onChange({ target: { value: "p2" } });
    const update = vi.mocked(useState).mock.results[0].value[1].mock.calls[0][0];
    expect(update(draft).ingredients).toEqual([{ productId: "p2", quantity: 2, netQuantity: null }]);
  });

});
