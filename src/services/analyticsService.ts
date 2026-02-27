import type { AnalyticsData, DashboardActivity } from "../types";
import { MOCK_ANALYTICS, MOCK_DASHBOARD_ACTIVITY } from "../utils/mockData";

// ============================================
// Analytics Service
// ============================================

/**
 * Get all analytics data
 * Currently returns mock data - will be replaced with API call
 */
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_ANALYTICS;
};

/**
 * Get dashboard activity data
 */
export const getDashboardActivity = async (): Promise<DashboardActivity[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_DASHBOARD_ACTIVITY;
};

/**
 * Get waste statistics
 */
export const getWasteStats = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_ANALYTICS.wasteStats;
};

/**
 * Get AI reliability metrics
 */
export const getAIReliability = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_ANALYTICS.aiReliability;
};

/**
 * Get savings summary
 */
export const getSavingsSummary = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const { savingsEvolution } = MOCK_ANALYTICS;
  const totalSavings = savingsEvolution.reduce((acc, s) => acc + s.amount, 0);
  return {
    total: totalSavings,
    evolution: savingsEvolution,
  };
};
