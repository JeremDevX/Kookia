import type { AnalyticsData, DashboardActivity } from "../types";
import { apiRequest } from "../config/api";

export const getAnalyticsData = () => apiRequest<AnalyticsData | null>("/workspace/analytics");
export const getDashboardActivity = () => apiRequest<DashboardActivity[] | null>("/workspace/activity");
export const getWasteStats = async () => (await getAnalyticsData())?.wasteStats ?? null;
export const getAIReliability = async () => (await getAnalyticsData())?.aiReliability ?? null;
export const getSavingsSummary = async () => {
  const data = await getAnalyticsData();
  if (!data) return null;
  const { savingsEvolution } = data;
  return { total: savingsEvolution.reduce((total, entry) => total + entry.amount, 0), evolution: savingsEvolution };
};
