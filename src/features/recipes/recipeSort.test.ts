import { expect, it } from "vitest";
import type { Recipe } from "../../types";
import { sortRecipes } from "./recipeSort";

it("trie par création initiale et place les dates inconnues après les recettes datées", () => {
  const recipe = (name: string, dates: string[]) => ({ name, versions: dates.map((createdAt) => ({ createdAt })) }) as Recipe;
  const recipes = [recipe("Éclair", []), recipe("Soupe", ["2025-01-01", "2026-01-01"]), recipe("Brioche", ["2025-06-01"])];
  expect(sortRecipes(recipes, "recent").map((item) => item.name)).toEqual(["Brioche", "Soupe", "Éclair"]);
  expect(sortRecipes(recipes, "name").map((item) => item.name)).toEqual(["Brioche", "Éclair", "Soupe"]);
  expect(recipes[0].name).toBe("Éclair");
});
