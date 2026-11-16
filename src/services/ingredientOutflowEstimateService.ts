import type { IngredientOutflowEstimateReport } from "../../shared/ingredientOutflowEstimate";
import { apiRequest } from "../config/api";

export const getIngredientOutflowEstimates = (from: string, to: string) => {
  const query = new URLSearchParams({ from, to });
  return apiRequest<IngredientOutflowEstimateReport>(`/workspace/ingredient-outflow-estimates?${query}`);
};
