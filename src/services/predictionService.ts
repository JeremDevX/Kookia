import type { Prediction } from "../types";
import { apiRequest } from "../config/api";
import { getPredictionPriority } from "../domain/predictions/prediction.policies";
import { isOnOrAfterRestaurantToday } from "../utils/date";
export { getPredictionPriority };

export const getPredictions = () => apiRequest<Prediction[]>("/workspace/predictions");
export const getPredictionsByProduct = async (productId: string) => (await getPredictions()).filter((prediction) => prediction.productId === productId);
export const getActionablePredictions = async () => (await getPredictions()).filter((prediction) =>
  isOnOrAfterRestaurantToday(prediction.predictedDate) &&
  (prediction.recommendation?.action === "buy" || prediction.recommendation?.action === "reduce"));
export const getPredictionsByDate = async (date: string) => (await getPredictions()).filter((prediction) => prediction.predictedDate === date);
export const getUrgentPredictions = async () => (await getPredictions()).filter((prediction) => getPredictionPriority(prediction) === "critical");
