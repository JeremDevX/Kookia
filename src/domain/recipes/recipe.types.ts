export interface RecipeIngredient {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
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
}

export interface Recipe {
  id: string;
  name: string;
  category: "Plat" | "Dessert" | "Entrée";
  prepTime: number;
  yieldPortions: number;
  revision: number;
  version: number;
  effectiveFrom: string | null;
  ingredients: RecipeIngredient[];
  versions: RecipeVersion[];
  lastMade?: string;
}
