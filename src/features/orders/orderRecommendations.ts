import type { CartItem } from "../../context/cart.types";

export const createOrderRecommendationsFromCartItems = (cartItems: CartItem[]) =>
  cartItems.map((item) => ({
    cartId: item.id,
    predictionId: item.predictionId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    reason: item.predictionId ? "Proposition non rapprochée — ne peut pas être commandée" : item.purchaseSuggestionOperationId ? "Issu des recommandations : besoin prévu, stock compté déduit et pas de commande appliqué." : item.source === "stocks"
      ? "Choisi dans Stocks. Quantité initiale basée sur le seuil, pas sur les ventes."
      : "Sélection enregistrée auparavant. Vérifiez la quantité et le stock.",
  }));
