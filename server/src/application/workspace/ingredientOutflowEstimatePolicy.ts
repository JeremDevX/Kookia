import { ESTIMATED_LOSS_SHARE, ESTIMATED_SALES_SHARE, roundEstimatedQuantity } from "../../../../shared/ingredientOutflowAssumptions.js";

export { ESTIMATED_LOSS_SHARE, ESTIMATED_SALES_SHARE };

export interface ReceivedIngredient {
  id: string;
  receiptId: string;
  receiptReference: string;
  deliveryDate: string;
  productId: string;
  productName: string;
  unit: string;
  receivedQuantity: number;
}

export interface DatedRecipeVersion {
  recipeId: string;
  recipeName: string;
  version: number;
  effectiveFrom: string;
  yieldPortions: number;
  ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }>;
}

export interface IngredientOutflowEstimate {
  id: string;
  receiptId: string;
  receiptReference: string;
  deliveryDate: string;
  productId: string;
  productName: string;
  unit: string;
  receivedQuantity: number;
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  recipeEffectiveFrom: string;
  recipeIngredientQuantity: number;
  yieldPortions: number;
  possiblePortions: number;
  estimatedSoldPortions: number;
  estimatedLossPortions: number;
  estimatedSoldQuantity: number;
  estimatedLossQuantity: number;
  otherIngredientCount: number;
}

export interface UnestimatedReceivedIngredient extends ReceivedIngredient {
  reason: "no_dated_compatible_recipe";
}

function latestVersionsForDate(versions: DatedRecipeVersion[], deliveryDate: string) {
  const latest = new Map<string, DatedRecipeVersion>();
  for (const version of versions) {
    if (version.effectiveFrom > deliveryDate || version.yieldPortions <= 0) continue;
    const previous = latest.get(version.recipeId);
    if (!previous || version.effectiveFrom > previous.effectiveFrom ||
        (version.effectiveFrom === previous.effectiveFrom && version.version > previous.version))
      latest.set(version.recipeId, version);
  }
  return latest.values();
}

export function estimateIngredientOutflows(receipts: ReceivedIngredient[], versions: DatedRecipeVersion[]) {
  const estimates: IngredientOutflowEstimate[] = [];
  const unestimatedReceipts: UnestimatedReceivedIngredient[] = [];
  for (const receipt of receipts) {
    const receiptEstimates: IngredientOutflowEstimate[] = [];
    for (const recipe of latestVersionsForDate(versions, receipt.deliveryDate)) {
      const ingredient = recipe.ingredients.find((item) => item.productId === receipt.productId && item.unit === receipt.unit);
      if (!ingredient || ingredient.quantity <= 0) continue;
      const quantityPerPortion = ingredient.quantity / recipe.yieldPortions;
      const possiblePortions = receipt.receivedQuantity / quantityPerPortion;
      receiptEstimates.push({
        id: `${receipt.id}:${recipe.recipeId}:${recipe.version}`,
        receiptId: receipt.receiptId,
        receiptReference: receipt.receiptReference,
        deliveryDate: receipt.deliveryDate,
        productId: receipt.productId,
        productName: receipt.productName,
        unit: receipt.unit,
        receivedQuantity: receipt.receivedQuantity,
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        recipeVersion: recipe.version,
        recipeEffectiveFrom: recipe.effectiveFrom,
        recipeIngredientQuantity: roundEstimatedQuantity(ingredient.quantity),
        yieldPortions: recipe.yieldPortions,
        possiblePortions: roundEstimatedQuantity(possiblePortions),
        estimatedSoldPortions: roundEstimatedQuantity(possiblePortions * ESTIMATED_SALES_SHARE),
        estimatedLossPortions: roundEstimatedQuantity(possiblePortions * ESTIMATED_LOSS_SHARE),
        estimatedSoldQuantity: roundEstimatedQuantity(receipt.receivedQuantity * ESTIMATED_SALES_SHARE),
        estimatedLossQuantity: roundEstimatedQuantity(receipt.receivedQuantity * ESTIMATED_LOSS_SHARE),
        otherIngredientCount: recipe.ingredients.length - 1,
      });
    }
    if (receiptEstimates.length === 0) {
      unestimatedReceipts.push({ ...receipt, reason: "no_dated_compatible_recipe" });
    } else estimates.push(...receiptEstimates);
  }
  const byDateProductReference = (a: ReceivedIngredient, b: ReceivedIngredient) =>
    a.deliveryDate.localeCompare(b.deliveryDate) ||
    a.productName.localeCompare(b.productName, "fr") || a.receiptId.localeCompare(b.receiptId);
  return {
    estimates: estimates.sort((a, b) => byDateProductReference(a, b) || a.recipeName.localeCompare(b.recipeName, "fr")),
    unestimatedReceipts: unestimatedReceipts.sort(byDateProductReference),
  };
}
