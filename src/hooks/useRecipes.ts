import { useCallback, useEffect, useRef, useState } from "react";
import type { Recipe } from "../types";
import { calculateMaxYield, calculateIngredientCost, getRecipes } from "../services/recipeService";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";

export const useRecipes = () => {
  const { products, loading: productsLoading, error: productsError, refetch: refreshProducts } = useInventoryCatalog();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pending = useRef<Promise<Recipe[]> | null>(null);

  const refetch = useCallback(async () => {
    const request = getRecipes();
    pending.current = request;
    setLoading(true);
    setError(null);
    try {
      const data = await request;
      if (pending.current === request) setRecipes(data);
    } catch (cause) {
      if (pending.current === request) setError(cause instanceof Error ? cause : new Error("Recettes indisponibles."));
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refetch();
    return () => { pending.current = null; };
  }, [refetch]);

  const productsReady = !productsLoading && !productsError;
  return {
    recipes, loading, error, refetch,
    products, productsLoading, productsError, productsReady, refreshProducts,
    getMaxYield: (recipe: Recipe) => productsReady ? calculateMaxYield(recipe, products) : 0,
    getIngredientCost: (recipe: Recipe) => productsReady ? calculateIngredientCost(recipe, products) : null,
    getProductName: (id: string) => products.find((product) => product.id === id)?.name ?? "Inconnu",
    getProductUnit: (id: string) => products.find((product) => product.id === id)?.unit ?? "",
  };
};
