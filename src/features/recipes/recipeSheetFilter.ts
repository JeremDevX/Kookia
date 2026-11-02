import type { Recipe } from "../../types";

export type RecipeSheetStatus = "all" | "complete" | "incomplete";

export function filterRecipeSheets(recipes: Recipe[], search: string, status: RecipeSheetStatus): Recipe[] {
  const query = search.trim().toLocaleLowerCase("fr");
  return recipes.filter((recipe) => recipe.name.toLocaleLowerCase("fr").includes(query) &&
    (status === "all" || (status === "complete" ? recipe.ingredients.length > 0 : recipe.ingredients.length === 0)));
}
