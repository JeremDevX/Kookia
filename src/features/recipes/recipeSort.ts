import type { Recipe } from "../../types";

export type RecipeSort = "recent" | "name";

export function sortRecipes<T extends Recipe>(recipes: T[], sort: RecipeSort): T[] {
  const createdAt = (recipe: Recipe) => {
    const dates = recipe.versions.map((version) => Date.parse(version.createdAt)).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : Number.NEGATIVE_INFINITY;
  };
  return [...recipes].sort((a, b) => {
    const aDate = createdAt(a);
    const bDate = createdAt(b);
    if (sort === "recent" && aDate !== bDate) return bDate > aDate ? 1 : -1;
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}
