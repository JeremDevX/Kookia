export interface RecipeIngredient {
  productId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: "Plat" | "Dessert" | "Entrée";
  prepTime: number;
  ingredients: RecipeIngredient[];
  lastMade?: string;
}
