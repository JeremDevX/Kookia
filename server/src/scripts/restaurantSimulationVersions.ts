import { scenarioProducts, scenarioRecipes } from "./restaurantSimulationCatalog.js";

export interface PlannedRecipeVersion {
  recipeId: string;
  sequence: number;
  effectiveFrom: string;
  ingredients: Array<{ productId: string; productKey: string; quantity: number }>;
}

const DEMO_RECIPE_CHANGE = { recipeId: "r3", effectiveFrom: "2025-06-16", productKey: "cream", quantity: 0.04 };

export function buildScenarioRecipeVersions(startDate: string, includeDemoStory = false): PlannedRecipeVersion[] {
  const versions = scenarioRecipes.map((recipe): PlannedRecipeVersion => ({
    recipeId: recipe.id, sequence: 1, effectiveFrom: startDate,
    ingredients: recipe.ingredients.map((ingredient) => ({
      productId: scenarioProducts.find((product) => product.key === ingredient.productKey)!.id,
      productKey: ingredient.productKey, quantity: ingredient.quantity,
    })),
  }));
  if (!includeDemoStory) return versions;

  const base = versions.find((version) => version.recipeId === DEMO_RECIPE_CHANGE.recipeId);
  const ingredient = base?.ingredients.find((row) => row.productKey === DEMO_RECIPE_CHANGE.productKey);
  if (!base || !ingredient) throw new Error("La modification de recette de démonstration ne correspond plus au catalogue.");
  versions.push({ ...base, sequence: 2, effectiveFrom: DEMO_RECIPE_CHANGE.effectiveFrom,
    ingredients: base.ingredients.map((row) => row === ingredient ? { ...row, quantity: DEMO_RECIPE_CHANGE.quantity } : row),
  });
  return versions.sort((left, right) => left.recipeId.localeCompare(right.recipeId) || left.sequence - right.sequence);
}

export function recipeVersionForDate(versions: PlannedRecipeVersion[], recipeId: string, date: string) {
  const version = versions.filter((candidate) => candidate.recipeId === recipeId && candidate.effectiveFrom <= date)
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom) || right.sequence - left.sequence)[0];
  if (!version) throw new Error(`Version de recette absente pour ${recipeId} au ${date}.`);
  return version;
}
