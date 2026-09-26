import type { IngredientOutflowEstimateReport } from "../../services/ingredientOutflowEstimateService";

export type StoredEstimateRequest = {
  requestKey: string;
  result: { status: "success"; report: IngredientOutflowEstimateReport } | { status: "error"; message: string };
} | null;

export type CurrentEstimateRequest =
  | { status: "loading" }
  | { status: "success"; report: IngredientOutflowEstimateReport }
  | { status: "error"; message: string };

export function currentEstimateRequest(state: StoredEstimateRequest, requestKey: string): CurrentEstimateRequest {
  if (!state || state.requestKey !== requestKey) return { status: "loading" };
  return state.result;
}
