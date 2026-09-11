import type { Recipe } from "../types";
import { apiRequest } from "../config/api";

export const getRecipes = () => apiRequest<Recipe[]>("/workspace/recipes");
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
  operationId: string; recipeId?: string; recipeName: string; portions: number;
  prepTime: number; notes: string; date: string; kind: "production" | "record" | "refusal";
}
export interface Production extends ProductionInput { id: string; createdAt: string; }
export const getProductions = () => apiRequest<Production[]>("/workspace/productions");
export const recordProduction = (data: ProductionInput) => apiRequest<Production>("/workspace/productions", { method: "POST", body: JSON.stringify(data) });
