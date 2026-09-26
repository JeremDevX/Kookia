import type { PurchaseSuggestion, PurchaseSuggestions } from "../../services/orderService";

export function summarizePurchaseForecast(data: PurchaseSuggestions, cartProductIds: string[]) {
  const inCart = new Set(cartProductIds);
  const actionable = data.status === "ready" && data.blockers.length === 0;
  const toReview = actionable ? data.suggestions.filter((item) => item.canAdd &&
    item.estimatedQuantity !== null && item.estimatedQuantity > 0 &&
    !item.decision && !inCart.has(item.productId)) : [];
  toReview.sort((a, b) => a.supplierName.localeCompare(b.supplierName, "fr") ||
    a.productName.localeCompare(b.productName, "fr"));
  const needsCheck = data.suggestions.filter((item) =>
    item.status === "needs_stock_count" || item.status === "unit_mismatch");
  const covered = data.suggestions.filter((item) => item.status === "covered");
  const handled = data.suggestions.filter((item) => item.decision || inCart.has(item.productId));
  const estimatedCost = toReview.length > 0 && toReview.every((item) => item.estimatedCost !== null)
    ? toReview.reduce((total, item) => total + item.estimatedCost!, 0) : null;
  return { toReview, needsCheck, covered, handled, estimatedCost,
    supplierCount: new Set(toReview.map((item) => item.supplierName)).size };
}

export function purchaseForecastItemStatus(item: PurchaseSuggestion) {
  if (item.decision?.orderId) return "Commande enregistrée";
  if (item.decision?.kind === "excluded") return "Écarté de la proposition";
  return "En cours de préparation";
}
