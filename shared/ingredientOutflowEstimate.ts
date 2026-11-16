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

export interface IngredientOutflowEstimate extends ReceivedIngredient {
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

export interface IngredientOutflowEstimateReport {
  from: string;
  to: string;
  assumptions: { estimatedSalesShare: number; estimatedLossShare: number };
  estimates: IngredientOutflowEstimate[];
  unestimatedReceipts: UnestimatedReceivedIngredient[];
}
