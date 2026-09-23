import type { Product } from "../inventory/product.types";
import type { Recipe, RecipeIngredient } from "./recipe.types";

export const calculateMaxYieldFromInventory = (
  recipe: Recipe,
  products: Product[]
): number => {
  if (recipe.ingredients.length === 0) return 0;

  const yields = recipe.ingredients.map((ingredient) => {
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product || ingredient.quantity <= 0) return 0;
    const ingredientUnits = Math.round(ingredient.quantity * 1000);
    if (ingredientUnits === 0) return 0;
    return Math.floor(Math.round(product.currentStock * 1000) / ingredientUnits);
  });

  return Math.min(...yields);
};

export const calculateIngredientCostFromInventory = (
  ingredients: RecipeIngredient[],
  products: Product[]
): number | null => {
  if (ingredients.length === 0) return null;
  let total = 0;
  for (const ingredient of ingredients) {
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product || ingredient.quantity <= 0) return null;
    total += product.pricePerUnit * ingredient.quantity;
  }
  return total;
};
