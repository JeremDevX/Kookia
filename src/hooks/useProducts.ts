import { useState, useEffect, useCallback } from "react";
import type { Product } from "../types";
import { getProducts, getProductStatus } from "../services/productService";
import type { ProductStatus } from "../types";

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getStatus: (product: Product) => ProductStatus;
}

/**
 * Hook for accessing product data with loading/error states
 */
export const useProducts = (): UseProductsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch products")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    getStatus: getProductStatus,
  };
};

/**
 * Hook for managing a local copy of products with mutations
 */
export const useProductsWithMutations = () => {
  const { products: initialProducts, loading, error, refetch } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const updateStock = useCallback((id: string, amount: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, currentStock: Math.max(0, p.currentStock + amount) }
          : p
      )
    );
  }, []);

  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => [...prev, product]);
  }, []);

  return {
    products,
    loading,
    error,
    refetch,
    updateStock,
    addProduct,
    getStatus: getProductStatus,
  };
};
