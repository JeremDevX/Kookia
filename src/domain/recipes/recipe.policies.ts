import type { Product } from "../inventory/product.types";
import type { Recipe, RecipeIngredient } from "./recipe.types";

export const calculateMaxYieldFromInventory = (
  recipe: Recipe,
  products: Product[]
): number => {
  if (recipe.ingredients.length === 0) return 0;

  const yields = recipe.ingredients.map((ingredient) => {
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product || ingredient.quantity === 0) return 0;
    return Math.floor(product.currentStock / ingredient.quantity);
  });

  return Math.min(...yields);
};

export const calculateIngredientCostFromInventory = (
  ingredients: RecipeIngredient[],
  products: Product[]
): number =>
  ingredients.reduce((sum, ingredient) => {
    const product = products.find((item) => item.id === ingredient.productId);
    return sum + (product ? product.pricePerUnit * ingredient.quantity : 0);
  }, 0);
