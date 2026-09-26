import type { Product, ProductStatus } from "./product.types";
import { getOrderStep, roundOrderQuantity } from "../../../shared/orderQuantity.js";
import { getStockVerificationStatus } from "./stockCount.policies";

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
  if (getStockVerificationStatus(product) !== "counted") return "neutral";
  if (product.currentStock <= 0) return "urgent";
  if (product.currentStock <= product.minThreshold) return "moderate";
  return "optimal";
};

export const needsStockReview = (product: Product): boolean => {
  const status = getProductStatus(product);
  return status === "urgent" || status === "moderate" ||
    (status === "neutral" && product.currentStock <= product.minThreshold);
};

export const getSuggestedOrderQuantity = (product: Product): number =>
  roundOrderQuantity(Math.max(getOrderStep(product), product.minThreshold - product.currentStock), getOrderStep(product));

export const getProductStatusLabel = (status: ProductStatus): string => {
  switch (status) {
    case "urgent":
      return "Rupture confirmée";
    case "moderate":
      return "À surveiller";
    case "optimal":
      return "Bon";
    default:
      return "À vérifier";
  }
};
