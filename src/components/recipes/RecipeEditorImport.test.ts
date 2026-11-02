import { useEffect, useState } from "react";
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
});
