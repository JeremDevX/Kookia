export function productionIngredientAmount(quantity: number, portions: number, yieldPortions: number, unit: string): number | null {
  const numerator = Math.round(quantity * 1000) * portions;
  if (unit === "pcs" && numerator % (yieldPortions * 1000) !== 0) return null;
  const amount = Math.floor((2 * numerator + yieldPortions) / (2 * yieldPortions)) / 1000;
  return amount > 0 ? amount : null;
}

