export const recipeCategories = ["Plat", "Dessert", "Entrée", "Boisson"] as const;
export type RecipeCategory = (typeof recipeCategories)[number];
