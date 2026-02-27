import { describe, expect, it } from "vitest";
import type { Prediction } from "../types";
import { getPredictionPriority } from "./predictionService";

const getIsoDateWithOffset = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createPrediction = (overrides: Partial<Prediction>): Prediction => ({
  id: "pred-1",
  productId: "p1",
  productName: "Tomates",
  predictedDate: getIsoDateWithOffset(1),
  predictedConsumption: 100,
  confidence: 0.8,
  recommendation: {
    action: "buy",
    quantity: 50,
    reason: "stock low",
  },
  ...overrides,
});

describe("predictionService/getPredictionPriority", () => {
  it("returns normal for past predictions", () => {
    const prediction = createPrediction({
      predictedDate: getIsoDateWithOffset(-1),
    });

    expect(getPredictionPriority(prediction)).toBe("normal");
  });

  it("returns critical for near-term buy with projected shortage", () => {
    const prediction = createPrediction({
      predictedDate: getIsoDateWithOffset(1),
      confidence: 0.92,
      recommendation: {
        action: "buy",
        quantity: 40,
        reason: "shortage expected",
      },
    });

    expect(getPredictionPriority(prediction)).toBe("critical");
  });

  it("returns high for medium-term reduce recommendations", () => {
    const prediction = createPrediction({
      predictedDate: getIsoDateWithOffset(2),
      confidence: 0.8,
      recommendation: {
        action: "reduce",
        quantity: 150,
        reason: "overstock risk",
      },
    });

    expect(getPredictionPriority(prediction)).toBe("high");
  });
});
