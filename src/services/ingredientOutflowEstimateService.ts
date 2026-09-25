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
}

export const getIngredientOutflowEstimates = (from: string, to: string) => {
  const query = new URLSearchParams({ from, to });
  return apiRequest<IngredientOutflowEstimateReport>(`/workspace/ingredient-outflow-estimates?${query}`);
};
