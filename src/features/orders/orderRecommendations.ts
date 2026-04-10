import type { Product, Supplier } from "../../types";
import type { Prediction } from "../../types";

export type OrderRecommendationSource =
  | "prediction"
  | "notification"
  | "dashboard"
  | "stocks";

export interface CartOrderItemInput {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  source: Exclude<OrderRecommendationSource, "prediction">;
}

export interface OrderRecommendation {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  source: OrderRecommendationSource;
}

export interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface SupplierOrder {
  supplier: Supplier | undefined;
  items: OrderItem[];
}

export const createOrderRecommendationsFromPredictions = (
  predictions: Prediction[]
): OrderRecommendation[] =>
  predictions
    .filter((prediction) => prediction.recommendation?.action === "buy")
    .map((prediction) => ({
      id: prediction.id,
      productId: prediction.productId,
      productName: prediction.productName,
      quantity: prediction.recommendation?.quantity ?? 0,
      reason: prediction.recommendation?.reason ?? "Réapprovisionnement",
      source: "prediction",
    }));

export const createOrderRecommendationsFromCartItems = (
  cartItems: CartOrderItemInput[],
  products: Product[]
): OrderRecommendation[] =>
  cartItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      reason: `Depuis ${item.source} - ${product?.category ?? "Stock"}`,
      source: item.source,
    };
  });

export const groupRecommendationsBySupplier = (
  recommendations: OrderRecommendation[],
  products: Product[],
  suppliers: Supplier[]
): Record<string, SupplierOrder> =>
  recommendations.reduce<Record<string, SupplierOrder>>((acc, recommendation) => {
    const product = products.find((item) => item.id === recommendation.productId);
    if (!product) return acc;

    const supplierId = product.supplierId;
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier: suppliers.find((supplier) => supplier.id === supplierId),
        items: [],
      };
    }

    acc[supplierId].items.push({
      productName: product.name,
      quantity: recommendation.quantity,
      unit: product.unit,
      price: product.pricePerUnit * recommendation.quantity,
    });

    return acc;
  }, {});
