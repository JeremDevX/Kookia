export interface MenuStockAvailability {
  productId: string; productName: string; unit: string; quantity: number | null;
}

export interface MenuSurplusLabel {
  productId: string; productName: string; unit: string; quantity: number;
}

export interface MenuRecipeCandidate {
  recipeId: string; recipeName: string; category: "Entrée" | "Plat" | "Dessert";
  version: number; effectiveFrom: string; yieldPortions: number;
  ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }>;
}

export function evaluateMenuRecipeIdea(recipe: MenuRecipeCandidate, labels: MenuSurplusLabel[],
  inventory: MenuStockAvailability[]) {
  const labelByProduct = new Map(labels.map((label) => [label.productId, label]));
  const usedLabels = labels.filter((label) => recipe.ingredients.some((ingredient) => ingredient.productId === label.productId));
  if (usedLabels.length === 0) return null;

  const stockByProduct = new Map(inventory.map((stock) => [stock.productId, stock]));
  const blockers: string[] = [];
  let maxPortions = Number.POSITIVE_INFINITY;
  for (const ingredient of recipe.ingredients) {
    const label = labelByProduct.get(ingredient.productId);
    const stock = stockByProduct.get(ingredient.productId);
    const available = label ? { unit: label.unit, quantity: label.quantity }
      : stock ? { unit: stock.unit, quantity: stock.quantity } : null;
    if (!available || available.quantity === null) {
      blockers.push(`Stock de ${ingredient.productName} non vérifié.`);
      maxPortions = Number.NaN;
      continue;
    }
    if (available.unit !== ingredient.unit) {
      blockers.push(`Unité de ${ingredient.productName} à vérifier.`);
      maxPortions = Number.NaN;
      continue;
    }
    if (!Number.isFinite(available.quantity) || available.quantity < 0 ||
        !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0) {
      blockers.push(`Quantité de ${ingredient.productName} à vérifier.`);
      maxPortions = Number.NaN;
      continue;
    }
    const portions = Math.floor(Math.round(available.quantity * 1000) * recipe.yieldPortions /
      Math.round(ingredient.quantity * 1000));
    if (!Number.isNaN(maxPortions)) maxPortions = Math.min(maxPortions, portions);
  }
  if (Number.isFinite(maxPortions) && maxPortions < 1) blockers.push("Stock compté insuffisant pour une portion.");
  const feasible = blockers.length === 0;
  return {
    recipeId: recipe.recipeId, recipeName: recipe.recipeName, category: recipe.category,
    version: recipe.version, effectiveFrom: recipe.effectiveFrom,
    status: feasible ? "feasible" as const : "not_feasible" as const,
    maximumPortions: feasible ? maxPortions : null,
    surplusProducts: usedLabels.map(({ productId, productName, quantity, unit }) => ({ productId, productName, quantity, unit })),
    blockers, expiryStatus: "unknown" as const,
  };
}
