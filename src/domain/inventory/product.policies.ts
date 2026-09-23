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

export const getSuggestedOrderQuantity = (product: Product): number =>
  Math.max(1, Math.round((product.minThreshold - product.currentStock) * 1000) / 1000);

export const getProductStatusLabel = (status: ProductStatus): string => {
  switch (status) {
    case "urgent":
      return "Critique";
    case "moderate":
      return "À surveiller";
    case "optimal":
      return "Bon";
    default:
      return "Neutre";
  }
};
