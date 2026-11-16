import { useCallback, useRef } from "react";
import type { NewProduct } from "../types/callbacks";
import { createProduct, createStockCount, editProduct, adjustProductStock, type NewStockCount, type ProductEdit, type StockAdjustment } from "../services/productService";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";

/**
 * Keep the loaded catalog in sync with product mutations.
 */
export const useProductsWithMutations = () => {
  const { updateProducts, ...catalog } = useInventoryCatalog();
  const stockQueue = useRef(Promise.resolve());

  const updateStock = useCallback((id: string, input: StockAdjustment, restaurantId: string) => {
    const operation = stockQueue.current.then(async () => {
      const updated = await adjustProductStock(id, input, restaurantId);
      updateProducts((prev) => prev.map((product) => product.id === id ? { ...product, ...updated } : product));
    });
    stockQueue.current = operation.catch(() => undefined);
    return operation;
  }, [updateProducts]);

  const addProduct = useCallback(async (product: NewProduct) => {
    const created = await createProduct(product);
    updateProducts((prev) => [...prev, created]);
  }, [updateProducts]);

  const updateProduct = useCallback(async (id: string, data: ProductEdit) => {
    const updated = await editProduct(id, data);
    updateProducts((prev) => prev.map((product) => product.id === id ? { ...product, ...updated } : product));
    return updated;
  }, [updateProducts]);

  const recordCount = useCallback(async (id: string, input: NewStockCount) => {
    const result = await createStockCount(id, input);
    updateProducts((prev) => prev.map((product) => product.id === id
      ? { ...product, ...result.product, latestCount: result.latestCount }
      : product));
    return result;
  }, [updateProducts]);

  return {
    ...catalog,
    updateStock,
    updateProduct,
    recordCount,
    addProduct,
  };
};
