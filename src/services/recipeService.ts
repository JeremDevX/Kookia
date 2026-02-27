import type { Recipe } from "../types";
import { MOCK_RECIPES, MOCK_PRODUCTS } from "../utils/mockData";

// ============================================
// Recipe Service
// ============================================

/**
 * Get all recipes
 * Currently returns mock data - will be replaced with API call
 */
export const getRecipes = async (): Promise<Recipe[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_RECIPES;
};

/**
 * Get a recipe by ID
 */
export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_RECIPES.find((r) => r.id === id) || null;
};

/**
 * Get recipes by category
 */
export const getRecipesByCategory = async (
  category: Recipe["category"]
): Promise<Recipe[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_RECIPES.filter((r) => r.category === category);
};

/**
 * Get recently made recipes (within last week)
 */
export const getRecentRecipes = async (): Promise<Recipe[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return MOCK_RECIPES.filter((r) => {
    if (!r.lastMade) return false;
    return new Date(r.lastMade) >= oneWeekAgo;
  });
};

/**
 * Calculate max yield for a recipe based on current stock
 */
export const calculateMaxYield = (recipe: Recipe): number => {
  if (recipe.ingredients.length === 0) return 0;

  const yields = recipe.ingredients.map((ing) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === ing.productId);
    if (!product || ing.quantity === 0) return 0;
    return Math.floor(product.currentStock / ing.quantity);
  });

  return Math.min(...yields);
};

/**
 * Get product name by ID (helper for recipe display)
 */
export const getProductNameForRecipe = (productId: string): string => {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  return product?.name || "Inconnu";
};

/**
 * Get product unit by ID (helper for recipe display)
 */
export const getProductUnitForRecipe = (productId: string): string => {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  return product?.unit || "";
};

/**
 * Calculate total ingredient cost for a recipe
 */
export const calculateIngredientCost = (
  ingredients: { productId: string; quantity: number }[]
): number => {
  return ingredients.reduce((sum, ing) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === ing.productId);
    return sum + (product ? product.pricePerUnit * ing.quantity : 0);
  }, 0);
};
