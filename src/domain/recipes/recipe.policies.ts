import type { Product } from "../inventory/product.types";
import type { Recipe } from "./recipe.types";

const gcd = (left: number, right: number): number => right === 0 ? left : gcd(right, left % right);

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
    return Math.floor(Math.round(product.currentStock * 1000) * recipe.yieldPortions / ingredientUnits);
  });

  const maxYield = Math.min(10_000, ...yields);
  let validPortionStep = 1;
  for (const ingredient of recipe.ingredients) {
    const product = products.find((item) => item.id === ingredient.productId);
    if (product?.unit !== "pcs") continue;
    if (!Number.isInteger(ingredient.quantity) || ingredient.quantity < 1) return 0;
    const period = recipe.yieldPortions / gcd(ingredient.quantity, recipe.yieldPortions);
    validPortionStep = validPortionStep / gcd(validPortionStep, period) * period;
    if (validPortionStep > maxYield) return 0;
  }
  return Math.floor(maxYield / validPortionStep) * validPortionStep;
};

export const calculateIngredientCostFromInventory = (
  recipe: Pick<Recipe, "ingredients" | "yieldPortions">,
  products: Product[]
): number | null => {
  if (recipe.ingredients.length === 0 || recipe.yieldPortions < 1) return null;
  let total = 0;
  for (const ingredient of recipe.ingredients) {
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product || ingredient.quantity <= 0) return null;
    total += product.pricePerUnit * ingredient.quantity / recipe.yieldPortions;
  }
  return total;
};
