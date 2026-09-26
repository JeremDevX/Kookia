import { apiRequest } from "../config/api";

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

export interface IngredientOutflowEstimateReport {
  from: string;
  to: string;
  assumptions: { estimatedSalesShare: number; estimatedLossShare: number };
  estimates: IngredientOutflowEstimate[];
  unestimatedReceipts: UnestimatedReceivedIngredient[];
}

export type UnestimatedReceivedIngredient = Pick<IngredientOutflowEstimate, "id" | "receiptId" | "receiptReference" | "deliveryDate" |
  "productId" | "productName" | "unit" | "receivedQuantity"> & { reason: "no_dated_compatible_recipe" };

export const getIngredientOutflowEstimates = (from: string, to: string) => {
  const query = new URLSearchParams({ from, to });
  return apiRequest<IngredientOutflowEstimateReport>(`/workspace/ingredient-outflow-estimates?${query}`);
};
