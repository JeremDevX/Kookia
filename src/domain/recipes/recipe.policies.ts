import type { Product } from "../inventory/product.types";
import { productionIngredientAmount } from "./productionIngredientAmount";
import type { Recipe } from "./recipe.types";

const gcd = (left: number, right: number): number => right === 0 ? left : gcd(right, left % right);
const maxProductionPortions = 10_000;

export const calculateMaxYieldFromInventory = (
  recipe: Recipe,
  products: Product[]
): number => {
  if (recipe.ingredients.length === 0 || recipe.yieldPortions < 1) return 0;

  const ingredients: { quantity: number; unit: string; available: number }[] = [];
  const yieldUnits = recipe.yieldPortions * 1000;
  let portionStep = 1;
  for (const ingredient of recipe.ingredients) {
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product || ingredient.quantity <= 0) return 0;
    const available = product.availableForProduction === undefined ? product.currentStock : product.availableForProduction ?? 0;
    if (available <= 0) return 0;
    const unit = ingredient.unit || product.unit;
    ingredients.push({ quantity: ingredient.quantity, unit, available });
    if (unit === "pcs") {
      const period = yieldUnits / gcd(Math.round(ingredient.quantity * 1000), yieldUnits);
      portionStep = portionStep / gcd(portionStep, period) * period;
      if (portionStep > maxProductionPortions) return 0;
    }
  }

  // At a whole-piece step, null represents a dosage below stock precision.
  let lower = 0;
  let upper = Math.floor(maxProductionPortions / portionStep);
  while (lower < upper) {
    const step = Math.ceil((lower + upper) / 2);
    const portions = step * portionStep;
    const fitsStock = ingredients.every(({ quantity, unit, available }) =>
      (productionIngredientAmount(quantity, portions, recipe.yieldPortions, unit) ?? 0) <= available);
    if (fitsStock) lower = step;
    else upper = step - 1;
  }

  const maxYield = lower * portionStep;
  return ingredients.every(({ quantity, unit }) =>
    productionIngredientAmount(quantity, maxYield, recipe.yieldPortions, unit) !== null) ? maxYield : 0;
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
