import type { AnalyticsData, DashboardActivity } from "../types";
import { apiRequest } from "../config/api";

export const getAnalyticsData = () => apiRequest<AnalyticsData>("/workspace/analytics");
export const getDashboardActivity = () => apiRequest<DashboardActivity[]>("/workspace/activity");
export const getWasteStats = async () => (await getAnalyticsData()).wasteStats;
export const getAIReliability = async () => (await getAnalyticsData()).aiReliability;
export const getSavingsSummary = async () => {
  const { savingsEvolution } = await getAnalyticsData();
  return { total: savingsEvolution.reduce((total, entry) => total + entry.amount, 0), evolution: savingsEvolution };
};
