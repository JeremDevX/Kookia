import { ESTIMATED_LOSS_SHARE, ESTIMATED_SALES_SHARE, roundEstimatedQuantity } from "../../../shared/ingredientOutflowAssumptions";
import { suggestRecipeFromIncomingProduct, type RecipeSuggestion, type RecipeSuggestionReceipt } from "./recipeSuggestionPolicy";
import type { Product } from "../inventory/product.types";

export interface SuggestedRecipeOutflowEstimate {
  unit: string;
  receivedQuantity: number;
  estimatedSalesShare: number;
  estimatedLossShare: number;
  possiblePortions: number;
  estimatedSoldPortions: number;
  estimatedLossPortions: number;
  estimatedSoldQuantity: number;
  estimatedLossQuantity: number;
}

export function estimateIncomingRecipeSuggestion(
  incoming: Pick<Product, "id" | "name" | "category" | "unit">,
  products: Array<Pick<Product, "id" | "name" | "category" | "unit">>,
  effectiveFrom: string,
  sourceReceipt: RecipeSuggestionReceipt,
) {
  const suggestion = suggestRecipeFromIncomingProduct(incoming, products, effectiveFrom, sourceReceipt);
  if (!suggestion) return null;
  const estimate = estimateSuggestedRecipeOutflow(suggestion);
  return estimate ? { suggestion, estimate } : null;
}

export function estimateSuggestedRecipeOutflow(suggestion: RecipeSuggestion): SuggestedRecipeOutflowEstimate | null {
  const receipt = suggestion.sourceReceipt;
  const sourceIngredient = suggestion.ingredients.find((ingredient) => ingredient.productId === suggestion.sourceProductId);
  if (!receipt || !sourceIngredient || receipt.unit !== sourceIngredient.unit ||
      !Number.isFinite(receipt.receivedQuantity) || receipt.receivedQuantity <= 0 ||
      !Number.isFinite(suggestion.yieldPortions) || suggestion.yieldPortions <= 0 ||
      !Number.isFinite(sourceIngredient.quantity) || sourceIngredient.quantity <= 0) return null;

  const quantityPerPortion = sourceIngredient.quantity / suggestion.yieldPortions;
  const possiblePortions = receipt.receivedQuantity / quantityPerPortion;
  if (!Number.isFinite(possiblePortions) || possiblePortions <= 0) return null;

  return {
    unit: receipt.unit,
    receivedQuantity: receipt.receivedQuantity,
    estimatedSalesShare: ESTIMATED_SALES_SHARE,
    estimatedLossShare: ESTIMATED_LOSS_SHARE,
    possiblePortions: roundEstimatedQuantity(possiblePortions),
    estimatedSoldPortions: roundEstimatedQuantity(possiblePortions * ESTIMATED_SALES_SHARE),
    estimatedLossPortions: roundEstimatedQuantity(possiblePortions * ESTIMATED_LOSS_SHARE),
    estimatedSoldQuantity: roundEstimatedQuantity(receipt.receivedQuantity * ESTIMATED_SALES_SHARE),
    estimatedLossQuantity: roundEstimatedQuantity(receipt.receivedQuantity * ESTIMATED_LOSS_SHARE),
  };
}
