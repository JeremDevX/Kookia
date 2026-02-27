import type { Prediction } from "../types";
import { MOCK_PREDICTIONS } from "../utils/mockData";

// ============================================
// Prediction Service
// ============================================

/**
 * Get all predictions
 * Currently returns mock data - will be replaced with API call
 */
export const getPredictions = async (): Promise<Prediction[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_PREDICTIONS;
};

/**
 * Get predictions for a specific product
 */
export const getPredictionsByProduct = async (
  productId: string
): Promise<Prediction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PREDICTIONS.filter((p) => p.productId === productId);
};

/**
 * Get predictions that require action (buy or reduce recommendations)
 */
export const getActionablePredictions = async (): Promise<Prediction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PREDICTIONS.filter(
    (p) =>
      p.recommendation?.action === "buy" ||
      p.recommendation?.action === "reduce"
  );
};

/**
 * Get predictions for a specific date
 */
export const getPredictionsByDate = async (
  date: string
): Promise<Prediction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PREDICTIONS.filter((p) => p.predictedDate === date);
};

/**
 * Get urgent predictions (high consumption, buy action)
 */
export const getUrgentPredictions = async (): Promise<Prediction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PREDICTIONS.filter(
    (p) => p.recommendation?.action === "buy" && p.confidence > 0.85
  );
};
