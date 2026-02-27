import type { Prediction, PredictionPriority } from "../types";
import { getBusinessDaysUntilDate } from "../utils/date";
import { MOCK_PREDICTIONS } from "../utils/mockData";

// ============================================
// Prediction Service
// ============================================

const getProjectedStockSignal = (prediction: Prediction): number => {
  const quantity = prediction.recommendation?.quantity ?? 0;
  const projectedGap = quantity - prediction.predictedConsumption;

  if (projectedGap <= 0) return 25;
  if (projectedGap < prediction.predictedConsumption * 0.3) return 15;
  if (projectedGap < prediction.predictedConsumption) return 8;
  return 0;
};

export const getPredictionPriority = (
  prediction: Prediction,
  referenceDate: Date = new Date()
): PredictionPriority => {
  const action = prediction.recommendation?.action;
  const daysUntil = getBusinessDaysUntilDate(
    prediction.predictedDate,
    referenceDate
  );

  // Past predictions are informational and should not drive urgent actions.
  if (daysUntil < 0) return "normal";

  let score = 0;

  if (action === "buy") score += 50;
  if (action === "reduce") score += 20;

  if (daysUntil <= 1) score += 25;
  else if (daysUntil <= 3) score += 15;
  else score += 5;

  score += getProjectedStockSignal(prediction);

  if (prediction.confidence >= 0.9) score += 10;
  else if (prediction.confidence >= 0.75) score += 6;
  else if (prediction.confidence < 0.6) score -= 4;

  if (score >= 80) return "critical";
  if (score >= 45) return "high";
  return "normal";
};

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
 * Get urgent predictions (multi-signal priority score)
 */
export const getUrgentPredictions = async (): Promise<Prediction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PREDICTIONS.filter((p) => getPredictionPriority(p) === "critical");
};
