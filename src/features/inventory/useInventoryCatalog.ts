import { useCallback, useEffect, useState } from "react";
import type { Product, Supplier } from "../../types";
import { getCatalog } from "../../services/productService";

export const useInventoryCatalog = () => {
  const [{ products, suppliers }, setCatalog] = useState<{ products: Product[]; suppliers: Supplier[] }>({
    products: [],
    suppliers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCatalog(await getCatalog());
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch inventory")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  return {
    products,
    suppliers,
    loading,
    error,
    refetch: fetchCatalog,
  };
};
