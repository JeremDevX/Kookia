export interface RecipeIngredient {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  netQuantity?: number | null;
}

export interface RecipeVersion {
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
  category: "Plat" | "Dessert" | "Entrée" | "Boisson";
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
