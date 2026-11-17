import type { Product, StockCountSummary, Supplier, Unit } from "../types";
import type { NewProduct } from "../types/callbacks";
import { apiRequest } from "../config/api";

interface InventoryCatalog { products: Product[]; suppliers: Supplier[]; }
interface CatalogRead {
  result: Promise<InventoryCatalog>;
  supersededBy?: Promise<InventoryCatalog>;
  invalidated?: boolean;
}

// Workspace requests are bound to the document's account by apiRequest.
let pendingCatalog: CatalogRead | undefined;
export function getCatalog({ fresh = false } = {}): Promise<InventoryCatalog> {
  if (fresh || !pendingCatalog || pendingCatalog.invalidated) {
    const replacement = () => request.supersededBy ?? (request.invalidated ? getCatalog() : undefined);
    const request: CatalogRead = {
      result: apiRequest<InventoryCatalog>("/workspace/catalog").then(
        (catalog) => replacement() ?? catalog,
        (cause: unknown) => {
          const next = replacement();
          if (next) return next;
          throw cause;
        },
      ).finally(() => {
        if (pendingCatalog === request) pendingCatalog = undefined;
      }),
    };
    if (pendingCatalog) pendingCatalog.supersededBy = request.result;
    pendingCatalog = request;
  }
  return pendingCatalog.result;
}

function catalogMutation<T>(request: Promise<T>) {
  return request.then((result) => {
    if (pendingCatalog) pendingCatalog.invalidated = true;
    return result;
  });
}

export const getProducts = async (): Promise<Product[]> => (await getCatalog()).products;
export const getSuppliers = async (): Promise<Supplier[]> => (await getCatalog()).suppliers;
export const createProduct = (product: NewProduct) => {
  const { id, ...data } = product;
  return catalogMutation(apiRequest<Product>("/workspace/products", { method: "POST", body: JSON.stringify({ ...data, operationId: id }) }));
};
export type ProductEdit = Pick<Product, "name" | "category" | "minThreshold" | "supplierId" | "pricePerUnit"> & { expectedRevision: number; orderPackQuantity?: number | null };
export const editProduct = (id: string, data: ProductEdit) =>
  catalogMutation(apiRequest<Product>(`/workspace/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }));
export interface NewStockCount {
  operationId: string; expectedStockRevision: number; expectedUnit: Unit; countedQuantity: number;
}
export interface StockCountResult { product: Product; count: StockCountSummary; latestCount: StockCountSummary | null; }
export const createStockCount = (id: string, data: NewStockCount) =>
  catalogMutation(apiRequest<StockCountResult>(`/workspace/products/${encodeURIComponent(id)}/counts`, { method: "POST", body: JSON.stringify(data) }));
export const getProductStockCounts = (id: string) =>
  apiRequest<StockCountSummary[]>(`/workspace/products/${encodeURIComponent(id)}/counts`);
export interface StockAdjustment { operationId: string; delta: number; reason: "adjustment" | "loss"; expectedStockRevision: number; expectedUnit: Unit; }
export const adjustProductStock = (id: string, data: StockAdjustment, restaurantId: string) =>
  catalogMutation(apiRequest<Product>(`/workspace/products/${encodeURIComponent(id)}/stock`, {
    method: "POST", headers: { "X-Expected-Restaurant-Id": restaurantId }, body: JSON.stringify(data),
  }));
export interface StockMovement {
  id: string; delta: number; reason: string; createdAt: string; sourceDocumentId?: string;
  sourceContentHash?: string; sourceDocumentRevision?: number; invoiceDocumentId?: string; invoiceRevision?: number;
  stockCountId?: string; purchaseReceiptLineId?: string;
}
export const getStockMovements = (id: string) => apiRequest<StockMovement[]>(`/workspace/products/${encodeURIComponent(id)}/movements`);
