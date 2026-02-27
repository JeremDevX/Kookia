import type { Product, ProductStatus } from "../types";
import { MOCK_PRODUCTS, MOCK_SUPPLIERS } from "../utils/mockData";
import type { Supplier } from "../types";

// ============================================
// Product Service
// ============================================

/**
 * Get all products
 * Currently returns mock data - will be replaced with API call
 */
export const getProducts = async (): Promise<Product[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_PRODUCTS;
};

/**
 * Get a product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PRODUCTS.find((p) => p.id === id) || null;
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (
  category: string
): Promise<Product[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PRODUCTS.filter((p) => p.category === category);
};

/**
 * Get product status based on stock levels
 */
export const getProductStatus = (product: Product): ProductStatus => {
  if (product.currentStock <= product.minThreshold * 0.7) return "urgent";
  if (product.currentStock <= product.minThreshold) return "moderate";
  return "optimal";
};

/**
 * Get all unique product categories
 */
export const getProductCategories = async (): Promise<string[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const categories = new Set(MOCK_PRODUCTS.map((p) => p.category));
  return Array.from(categories).sort();
};

/**
 * Get supplier for a product
 */
export const getSupplierForProduct = async (
  product: Product
): Promise<Supplier | null> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_SUPPLIERS.find((s) => s.id === product.supplierId) || null;
};

/**
 * Get all suppliers
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_SUPPLIERS;
};
