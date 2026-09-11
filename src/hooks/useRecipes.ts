import { useState, useEffect, useCallback } from "react";
import type { Product, Recipe } from "../types";
import {
  getRecipes,
  calculateMaxYield,
  calculateIngredientCost,
} from "../services/recipeService";

import { getProducts } from "../services/productService";

interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getMaxYield: (recipe: Recipe) => number;
  getIngredientCost: (
    ingredients: { productId: string; quantity: number }[]
  ) => number;
  getProductName: (productId: string) => string;
  getProductUnit: (productId: string) => string;
}

/**
 * Hook for accessing recipe data with loading/error states
 */
export const useRecipes = (): UseRecipesReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, inventory] = await Promise.all([getRecipes(), getProducts()]);
      setRecipes(data);
      setProducts(inventory);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch recipes")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return {
    recipes,
    loading,
    error,
    refetch: fetchRecipes,
    getMaxYield: (recipe) => calculateMaxYield(recipe, products),
    getIngredientCost: (ingredients) => calculateIngredientCost(ingredients, products),
    getProductName: (id) => products.find((product) => product.id === id)?.name ?? "Inconnu",
    getProductUnit: (id) => products.find((product) => product.id === id)?.unit ?? "",
  };
};
