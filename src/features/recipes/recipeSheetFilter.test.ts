import { expect, it } from "vitest";
import type { Recipe } from "../../types";
import { filterRecipeSheets } from "./recipeSheetFilter";

it("combine recherche et état sans qualifier une fiche incomplète de validée", () => {
  const recipes = [{ name: "Soupe", ingredients: [] }, { name: "Soupe verte", ingredients: [{}] }, { name: "Tarte", ingredients: [{}] }] as Recipe[];
  expect(filterRecipeSheets(recipes, "soupe", "complete").map((recipe) => recipe.name)).toEqual(["Soupe verte"]);
  expect(filterRecipeSheets(recipes, "", "incomplete").map((recipe) => recipe.name)).toEqual(["Soupe"]);
});
