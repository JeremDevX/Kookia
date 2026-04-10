export interface PredictionRecommendation {
  action: "buy" | "wait" | "reduce";
  quantity: number;
  reason: string;
}

export interface Prediction {
  id: string;
  productId: string;
  productName: string;
  predictedDate: string;
  predictedConsumption: number;
  confidence: number;
  recommendation?: PredictionRecommendation;
}

export type PredictionPriority = "critical" | "high" | "normal";
