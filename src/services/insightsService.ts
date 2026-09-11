import { apiRequest } from "../config/api";
import type { RoiSimulatorAssumptionsConfig } from "../config/domain/businessConfig";
export interface Insights {
  roi: RoiSimulatorAssumptionsConfig; predictionCount: number; source: "demo"; asOf: string;
  indicators: { id: "covers" | "revenue" | "forecast" | "waste"; label: string; value: string; unit: string; period: string; detail: string }[];
}
export const getInsights = () => apiRequest<Insights>("/workspace/insights");
