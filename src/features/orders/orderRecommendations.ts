import type { Product, Supplier } from "../../types";

export type OrderRecommendationSource =
  | "prediction"
  | "notification"
  | "dashboard"
  | "stocks";

export interface CartOrderItemInput {
  predictionId?: string;
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  source: OrderRecommendationSource;
}

export interface OrderRecommendation {
  cartId?: string;
  predictionId?: string;
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

export const createOrderRecommendationsFromCartItems = (
  cartItems: CartOrderItemInput[],
): OrderRecommendation[] =>
  cartItems.map((item) => ({
      id: item.id,
      cartId: item.id,
      predictionId: item.predictionId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      reason: item.predictionId ? "Scénario d'exemple — ne peut pas être commandé" : item.source === "stocks"
        ? "Choisi dans Stocks. Quantité initiale basée sur le seuil, pas sur les ventes."
        : "Sélection enregistrée auparavant. Vérifiez la quantité et le stock.",
      source: item.source,
  }));

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
