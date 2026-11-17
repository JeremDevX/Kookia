type OrderRecommendationSource =
  | "prediction"
  | "notification"
  | "dashboard"
  | "stocks";

interface CartOrderItemInput {
  purchaseSuggestionOperationId?: string;
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
      reason: item.predictionId ? "Proposition non rapprochée — ne peut pas être commandée" : item.purchaseSuggestionOperationId ? "Issu des recommandations : besoin prévu, stock compté déduit et pas de commande appliqué." : item.source === "stocks"
        ? "Choisi dans Stocks. Quantité initiale basée sur le seuil, pas sur les ventes."
        : "Sélection enregistrée auparavant. Vérifiez la quantité et le stock.",
      source: item.source,
  }));
