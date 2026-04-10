import type { Prediction, PredictionPriority } from "./prediction.types";
import { getBusinessDaysUntilDate } from "../../utils/date";

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
