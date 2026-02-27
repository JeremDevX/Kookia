import { useState, useEffect, useCallback } from "react";
import type { Recipe } from "../types";
import {
  getRecipes,
  calculateMaxYield,
  getProductNameForRecipe,
  getProductUnitForRecipe,
} from "../services/recipeService";

interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getMaxYield: (recipe: Recipe) => number;
  getProductName: (productId: string) => string;
  getProductUnit: (productId: string) => string;
}

/**
 * Hook for accessing recipe data with loading/error states
 */
export const useRecipes = (): UseRecipesReturn => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecipes();
      setRecipes(data);
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
    getMaxYield: calculateMaxYield,
    getProductName: getProductNameForRecipe,
    getProductUnit: getProductUnitForRecipe,
  };
};
