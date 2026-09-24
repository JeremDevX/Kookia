import type { Product, Supplier } from "../types";
import type { NewProduct } from "../types/callbacks";
import { apiRequest } from "../config/api";
export { getProductStatus } from "../domain/inventory/product.policies";

export const getCatalog = () => apiRequest<{ products: Product[]; suppliers: Supplier[] }>("/workspace/catalog");
export const getProducts = async (): Promise<Product[]> => (await getCatalog()).products;
export const getSuppliers = async (): Promise<Supplier[]> => (await getCatalog()).suppliers;
export const getProductById = async (id: string) => (await getProducts()).find((product) => product.id === id) ?? null;
export const getProductsByCategory = async (category: string) => (await getProducts()).filter((product) => product.category === category);
export const getProductCategories = async () => Array.from(new Set((await getProducts()).map((product) => product.category))).sort();
export const getSupplierForProduct = async (product: Product) => (await getSuppliers()).find((supplier) => supplier.id === product.supplierId) ?? null;
export const createProduct = (product: NewProduct) => {
  const { id, ...data } = product;
  return apiRequest<Product>("/workspace/products", { method: "POST", body: JSON.stringify({ ...data, operationId: id }) });
};
export type ProductEdit = Pick<Product, "name" | "category" | "minThreshold" | "supplierId" | "pricePerUnit"> & { expectedRevision: number };
export const editProduct = (id: string, data: ProductEdit) =>
  apiRequest<Product>(`/workspace/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
export const adjustProductStock = (id: string, delta: number, reason: "adjustment" | "loss" = "adjustment") =>
  apiRequest<Product>(`/workspace/products/${encodeURIComponent(id)}/stock`, { method: "POST", body: JSON.stringify({ delta, reason, operationId: crypto.randomUUID() }) });
export interface StockMovement {
  id: string; delta: number; reason: string; createdAt: string; sourceDocumentId?: string;
  sourceContentHash?: string; sourceDocumentRevision?: number; invoiceDocumentId?: string; invoiceRevision?: number;
}
export const getStockMovements = (id: string) => apiRequest<StockMovement[]>(`/workspace/products/${encodeURIComponent(id)}/movements`);
