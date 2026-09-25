export const ESTIMATED_SALES_SHARE = 0.9;
export const ESTIMATED_LOSS_SHARE = 0.1;

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
  yieldPortions: number;
  possiblePortions: number;
  estimatedSoldPortions: number;
  estimatedLossPortions: number;
  estimatedSoldQuantity: number;
  estimatedLossQuantity: number;
  otherIngredientCount: number;
}

const roundQuantity = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

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
  for (const receipt of receipts) {
    for (const recipe of latestVersionsForDate(versions, receipt.deliveryDate)) {
      const ingredient = recipe.ingredients.find((item) => item.productId === receipt.productId && item.unit === receipt.unit);
      if (!ingredient || ingredient.quantity <= 0) continue;
      const quantityPerPortion = ingredient.quantity / recipe.yieldPortions;
      const possiblePortions = receipt.receivedQuantity / quantityPerPortion;
      estimates.push({
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
        yieldPortions: recipe.yieldPortions,
        possiblePortions: roundQuantity(possiblePortions),
        estimatedSoldPortions: roundQuantity(possiblePortions * ESTIMATED_SALES_SHARE),
        estimatedLossPortions: roundQuantity(possiblePortions * ESTIMATED_LOSS_SHARE),
        estimatedSoldQuantity: roundQuantity(receipt.receivedQuantity * ESTIMATED_SALES_SHARE),
        estimatedLossQuantity: roundQuantity(receipt.receivedQuantity * ESTIMATED_LOSS_SHARE),
        otherIngredientCount: recipe.ingredients.length - 1,
      });
    }
  }
  return estimates.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) ||
    a.productName.localeCompare(b.productName, "fr") || a.recipeName.localeCompare(b.recipeName, "fr") ||
    a.receiptId.localeCompare(b.receiptId));
}
