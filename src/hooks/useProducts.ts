import { useState, useEffect, useCallback, useRef } from "react";
import type { Product } from "../types";
import type { NewProduct } from "../types/callbacks";
import { getProducts, getProductStatus, createProduct, createStockCount, editProduct, adjustProductStock, type NewStockCount, type ProductEdit } from "../services/productService";
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
  const stockQueue = useRef(Promise.resolve());

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const updateStock = useCallback((id: string, amount: number, reason: "adjustment" | "loss" = "adjustment") => {
    const operation = stockQueue.current.then(async () => {
      const updated = await adjustProductStock(id, amount, reason);
      setProducts((prev) => prev.map((product) => product.id === id ? { ...product, ...updated } : product));
    });
    stockQueue.current = operation.catch(() => undefined);
    return operation;
  }, []);

  const addProduct = useCallback(async (product: NewProduct) => {
    const created = await createProduct(product);
    setProducts((prev) => [...prev, created]);
  }, []);

  const updateProduct = useCallback(async (id: string, data: ProductEdit) => {
    const updated = await editProduct(id, data);
    setProducts((prev) => prev.map((product) => product.id === id ? { ...product, ...updated } : product));
    return updated;
  }, []);

  const recordCount = useCallback(async (id: string, input: NewStockCount) => {
    const result = await createStockCount(id, input);
    setProducts((prev) => prev.map((product) => product.id === id
      ? { ...product, ...result.product, latestCount: result.latestCount }
      : product));
    return result;
  }, []);

  return {
    products,
    loading,
    error,
    refetch,
    updateStock,
    updateProduct,
    recordCount,
    addProduct,
    getStatus: getProductStatus,
  };
};
