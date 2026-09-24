import { expect, it } from "vitest";
import { evaluateMenuRecipeIdea, type MenuRecipeCandidate, type MenuSurplusLabel } from "./menuIdeasPolicy.js";

const recipe: MenuRecipeCandidate = { recipeId: "recipe-1", recipeName: "Pâtes aux tomates", category: "Plat",
  version: 2, effectiveFrom: "2026-09-20", yieldPortions: 4, ingredients: [
    { productId: "tomato", productName: "Tomates", unit: "kg", quantity: 2 },
    { productId: "pasta", productName: "Pâtes", unit: "kg", quantity: 1 },
  ] };
const surplus: MenuSurplusLabel = { productId: "tomato", productName: "Tomates", unit: "kg", quantity: 2 };

it("uses the explicitly labelled quantity and current counts, not a global high-stock threshold", () => {
  expect(evaluateMenuRecipeIdea(recipe, [surplus], [
    { productId: "tomato", productName: "Tomates", unit: "kg", quantity: 90 },
    { productId: "pasta", productName: "Pâtes", unit: "kg", quantity: 20 },
  ])).toMatchObject({ status: "feasible", maximumPortions: 4,
    surplusProducts: [{ productId: "tomato", quantity: 2, unit: "kg" }], expiryStatus: "unknown" });
});

it("withholds feasibility when another ingredient is uncounted or units do not match", () => {
  expect(evaluateMenuRecipeIdea(recipe, [surplus], [
    { productId: "pasta", productName: "Pâtes", unit: "kg", quantity: null },
  ])).toMatchObject({ status: "not_feasible", maximumPortions: null,
    blockers: ["Stock de Pâtes non vérifié."], expiryStatus: "unknown" });
  expect(evaluateMenuRecipeIdea(recipe, [surplus], [
    { productId: "pasta", productName: "Pâtes", unit: "L", quantity: 20 },
  ])).toMatchObject({ status: "not_feasible", maximumPortions: null,
    blockers: ["Unité de Pâtes à vérifier."] });
});

it("does not suggest a recipe that does not use the labelled surplus", () => {
  expect(evaluateMenuRecipeIdea({ ...recipe, ingredients: [recipe.ingredients[1]] }, [surplus], [])).toBeNull();
  expect(evaluateMenuRecipeIdea({ ...recipe, ingredients: [] }, [surplus], [])).toBeNull();
});

it("calculates portions in thousandths without floating-point undercounting", () => {
  const decimalRecipe = { ...recipe, yieldPortions: 10,
    ingredients: [{ productId: "tomato", productName: "Tomates", unit: "kg", quantity: 0.1 }] };
  expect(evaluateMenuRecipeIdea(decimalRecipe, [{ ...surplus, quantity: 0.7 }], []))
    .toMatchObject({ status: "feasible", maximumPortions: 70 });
});
