import { createHash } from "node:crypto";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { getScenarioRecipeIngredients, type PlannedProduction } from "./restaurantSimulationPlan.js";
import { recipeIngredientCorrections, scenarioProducts, scenarioRecipes } from "./restaurantSimulationCatalog.js";

interface ProductRow {
  id: string; name: string; category: string; unit: string; currentStock: number; minThreshold: number;
  supplierId: string; pricePerUnit: number; lastDelivery: Date | null;
}

interface RecipeRow {
  id: string; name: string; category: string; prepTime: number; lastMade: Date | null;
  ingredients: Array<{ productId: string; quantity: number }>;
}

export interface PlannedRecipe {
  id: string; name: string; category: string; prepTime: number; lastMade: string | null;
  ingredients: Array<{ productId: string; quantity: number }>;
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const seedProducts = catalog.products as Array<ProductRow & Record<string, unknown>>;
const seedRecipes = catalog.recipes as Array<RecipeRow & { lastMade?: string }>;
const convertedSeedUnits: Record<string, number> = { p3: 12, p8: 0.3, p15: 0.05 };

export function assertSeedSnapshot(products: ProductRow[], recipes: RecipeRow[]) {
  const productById = new Map(products.map((product) => [product.id, product]));
  if (productById.size !== seedProducts.length) throw new Error("Le catalogue seed Camille a divergé : nombre de produits inattendu.");
  for (const seed of seedProducts) {
    const actual = productById.get(seed.id);
    if (!actual || actual.name !== seed.name || actual.category !== seed.category || actual.unit !== seed.unit ||
      Math.abs(actual.currentStock - Number(seed.currentStock)) > 0.0005 ||
      Math.abs(actual.minThreshold - Number(seed.minThreshold)) > 0.0005 || actual.supplierId !== seed.supplierId ||
      Math.abs(actual.pricePerUnit - Number(seed.pricePerUnit)) > 0.00005 || actual.lastDelivery !== null) {
      throw new Error(`Produit seed modifié hors scénario : ${seed.id}. Aucune donnée humaine ne sera écrasée.`);
    }
  }

  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  if (recipeById.size !== seedRecipes.length) throw new Error("Les recettes Camille ont divergé du seed ; aucune saisie ne sera écrasée.");
  for (const seed of seedRecipes) {
    const actual = recipeById.get(seed.id);
    const seedDate = seed.lastMade?.slice(0, 10) ?? null;
    const actualDate = actual?.lastMade?.toISOString().slice(0, 10) ?? null;
    const expectedIngredients = [...seed.ingredients].sort((a, b) => a.productId.localeCompare(b.productId));
    const actualIngredients = [...(actual?.ingredients ?? [])].map(({ productId, quantity }) => ({ productId, quantity: Number(quantity) }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
    if (!actual || actual.name !== seed.name || actual.category !== seed.category || actual.prepTime !== seed.prepTime ||
      actualDate !== seedDate || JSON.stringify(actualIngredients) !== JSON.stringify(expectedIngredients)) {
      throw new Error(`Recette seed modifiée hors scénario : ${seed.id}. Aucune saisie humaine ne sera écrasée.`);
    }
  }
}

export function buildRecipePlan(recipes: RecipeRow[], productions: PlannedProduction[]): PlannedRecipe[] {
  const sourceRecipes = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const latestMade = new Map<string, string>();
  for (const production of productions) latestMade.set(production.recipeId, production.date);
  const productUnits = new Map(scenarioProducts.map((product) => [product.id, product.unit]));
  const scenarioRecipeIds = new Set(scenarioRecipes.map((recipe) => recipe.id));

  return recipes.map((recipe) => {
    const scenarioRecipe = scenarioRecipes.find((candidate) => candidate.id === recipe.id);
    const replacement = recipeIngredientCorrections[recipe.id];
    const ingredients = scenarioRecipe ? getScenarioRecipeIngredients(recipe.id) : replacement ?? recipe.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      quantity: round(Number(ingredient.quantity) * (convertedSeedUnits[ingredient.productId] ?? 1)),
    }));
    if (!sourceRecipes.has(recipe.id)) throw new Error(`Recette absente du seed : ${recipe.id}.`);
    for (const ingredient of ingredients) {
      if (productUnits.get(ingredient.productId) === "pcs" && !Number.isInteger(ingredient.quantity)) {
        throw new Error(`La recette ${recipe.name} utilise une fraction de pièce (${ingredient.productId}).`);
      }
    }
    return { id: recipe.id, name: recipe.name, category: recipe.category, prepTime: recipe.prepTime,
      lastMade: scenarioRecipeIds.has(recipe.id) ? latestMade.get(recipe.id) ?? null : null,
      ingredients: [...ingredients].sort((a, b) => a.productId.localeCompare(b.productId)) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function digestRecipePlan(recipes: PlannedRecipe[]) {
  return createHash("sha256").update(JSON.stringify(recipes)).digest("hex");
}

export function isLegacyImportMovement(movement: { reason: string; operationId: string }) {
  const prefixes: Record<string, string[]> = {
    invoice_import_demo: ["source-receipt:", "source-correction:"],
    simulated_consumption: ["source-next:", "source-final:", "source-correction:"],
    simulated_unit_rounding: ["source-unit-rounding:"],
  };
  return prefixes[movement.reason]?.some((prefix) => movement.operationId.startsWith(prefix)) ?? false;
}
