import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, Supplier } from "../../types";
import { getCatalog } from "../../services/productService";

export const useInventoryCatalog = () => {
  const [{ products, suppliers, loaded }, setCatalog] = useState<{ products: Product[]; suppliers: Supplier[]; loaded: boolean }>({
    products: [],
    suppliers: [],
    loaded: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activeRead = useRef<Promise<{ products: Product[]; suppliers: Supplier[] }> | null>(null);

  const fetchCatalog = useCallback(async (fresh: boolean) => {
    const request = getCatalog({ fresh });
    activeRead.current = request;
    setLoading(true);
    setError(null);
    try {
      const catalog = await request;
      if (activeRead.current === request) setCatalog({ ...catalog, loaded: true });
      return true;
    } catch (err) {
      if (activeRead.current === request) {
        setError(err instanceof Error ? err : new Error("Catalogue indisponible."));
      }
      return false;
    } finally {
      if (activeRead.current === request) {
        activeRead.current = null;
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => fetchCatalog(true), [fetchCatalog]);
  const updateProducts = useCallback((update: (products: Product[]) => Product[]) => {
    setCatalog((catalog) => ({ ...catalog, products: update(catalog.products) }));
  }, []);

  useEffect(() => {
    void fetchCatalog(false);
    return () => { activeRead.current = null; };
  }, [fetchCatalog]);

  return {
    products,
    suppliers,
    loaded,
    loading,
    error,
    refetch,
    updateProducts,
  };
};
