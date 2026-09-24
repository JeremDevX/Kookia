import type { Recipe, RecipeIngredient } from "../types";
import { apiRequest } from "../config/api";

export const getRecipes = () => apiRequest<Recipe[]>("/workspace/recipes");
export interface RecipeMutation {
  operationId: string; name: string; category: Recipe["category"]; prepTime: number;
  yieldPortions: number; effectiveFrom: string; ingredients: Array<Pick<RecipeIngredient, "productId" | "quantity">>;
}
export const createRecipe = (data: RecipeMutation) => apiRequest<Recipe>("/workspace/recipes", {
  method: "POST", body: JSON.stringify(data),
});
export const updateRecipe = (id: string, expectedRevision: number, data: RecipeMutation) =>
  apiRequest<Recipe>(`/workspace/recipes/${id}`, {
    method: "PATCH", body: JSON.stringify({ ...data, expectedRevision }),
  });
export const getRecipeById = async (id: string) => (await getRecipes()).find((recipe) => recipe.id === id) ?? null;
export const getRecipesByCategory = async (category: Recipe["category"]) => (await getRecipes()).filter((recipe) => recipe.category === category);
export const getRecentRecipes = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return (await getRecipes()).filter((recipe) => recipe.lastMade && new Date(recipe.lastMade) >= oneWeekAgo);
};
export {
  calculateMaxYieldFromInventory as calculateMaxYield,
  calculateIngredientCostFromInventory as calculateIngredientCost,
} from "../domain/recipes/recipe.policies";
export interface ProductionInput {
  operationId: string; recipeId?: string; expectedRecipeRevision?: number; recipeName: string; portions: number;
  prepTime: number; notes: string; date: string; kind: "production" | "record" | "refusal";
}
export interface Production extends Omit<ProductionInput, "expectedRecipeRevision"> {
  id: string; createdAt: string; recipeVersionId: string | null;
  recipeVersion: { version: number; effectiveFrom: string | null; yieldPortions: number } | null;
}
export const getProductions = () => apiRequest<Production[]>("/workspace/productions");
export const recordProduction = (data: ProductionInput) => apiRequest<Production>("/workspace/productions", { method: "POST", body: JSON.stringify(data) });
