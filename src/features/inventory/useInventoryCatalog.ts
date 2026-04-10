import { useCallback, useEffect, useState } from "react";
import type { Product, Supplier } from "../../types";
import { getProducts, getSuppliers } from "../../services/productService";

interface UseInventoryCatalogResult {
  products: Product[];
  suppliers: Supplier[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  findProductById: (productId: string) => Product | undefined;
  findSupplierByProductId: (productId: string) => Supplier | undefined;
}

export const useInventoryCatalog = (): UseInventoryCatalogResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextProducts, nextSuppliers] = await Promise.all([
        getProducts(),
        getSuppliers(),
      ]);

      setProducts(nextProducts);
      setSuppliers(nextSuppliers);
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

  const findProductById = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products]
  );

  const findSupplierByProductId = useCallback(
    (productId: string) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return undefined;

      return suppliers.find((supplier) => supplier.id === product.supplierId);
    },
    [products, suppliers]
  );

  return {
    products,
    suppliers,
    loading,
    error,
    refetch: fetchCatalog,
    findProductById,
    findSupplierByProductId,
  };
};
