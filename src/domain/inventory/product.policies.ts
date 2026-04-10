import type { Product, ProductStatus } from "./product.types";

export const getStatusColor = (status: ProductStatus): string => {
  switch (status) {
    case "urgent":
      return "var(--color-urgent)";
    case "moderate":
      return "var(--color-moderate)";
    case "optimal":
      return "var(--color-optimal)";
    default:
      return "var(--color-text-secondary)";
  }
};

export const getProductStatus = (product: Product): ProductStatus => {
  if (product.currentStock <= product.minThreshold * 0.7) return "urgent";
  if (product.currentStock <= product.minThreshold) return "moderate";
  return "optimal";
};

export const getProductStatusLabel = (status: ProductStatus): string => {
  switch (status) {
    case "urgent":
      return "Critique";
    case "moderate":
      return "Moyen";
    case "optimal":
      return "Bon";
    default:
      return "Neutre";
  }
};
