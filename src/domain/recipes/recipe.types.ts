import type { RecipeCategory } from "../../../shared/recipeCategory";

export interface RecipeIngredient {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  netQuantity?: number | null;
}

interface RecipeVersion {
  version: number;
  effectiveFrom: string | null;
  actorId: string;
  createdAt: string;
  name: string;
  category: Recipe["category"];
  prepTime: number;
  yieldPortions: number;
  ingredients: RecipeIngredient[];
  steps?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  prepTime: number;
  yieldPortions: number;
  revision: number;
  version: number;
  effectiveFrom: string | null;
  ingredients: RecipeIngredient[];
  steps?: string[];
  versions: RecipeVersion[];
  lastMade?: string;
}
