import type { Prediction, PredictionPriority } from "./prediction.types";
import { getBusinessDaysUntilDate } from "../../utils/date";

export const isActionablePurchasePrediction = (
  prediction: Prediction,
  referenceDate: Date = new Date()
): boolean => prediction.recommendation?.action === "buy" &&
  Number.isFinite(prediction.recommendation.quantity) &&
  prediction.recommendation.quantity > 0 &&
  prediction.recommendation.quantity <= 1_000_000 &&
  getBusinessDaysUntilDate(prediction.predictedDate, referenceDate) >= 0;

export const getPredictionPriority = (
  prediction: Prediction,
  referenceDate: Date = new Date()
): PredictionPriority => {
  const daysUntil = getBusinessDaysUntilDate(
    prediction.predictedDate,
    referenceDate
  );

  if (daysUntil < 0) return "normal";
  if (isActionablePurchasePrediction(prediction, referenceDate)) {
    if (daysUntil <= 1) return "critical";
    if (daysUntil <= 3) return "high";
  }
  if (prediction.recommendation?.action === "reduce" && daysUntil <= 1) return "high";
  return "normal";
};
