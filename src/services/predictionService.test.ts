import { describe, expect, it } from "vitest";
import type { Prediction } from "../types";
import { isOnOrAfterRestaurantToday } from "../utils/date";
import { getPredictionPriority } from "./predictionService";

const createPrediction = (overrides: Partial<Prediction>): Prediction => ({
  id: "pred-1",
  productId: "p1",
  productName: "Tomates",
  predictedDate: "2026-05-03",
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
  it("returns normal for previous business day around restaurant midnight", () => {
    const prediction = createPrediction({
      predictedDate: "2026-05-02",
    });

    const referenceDate = new Date("2026-05-02T22:30:00.000Z");
    expect(getPredictionPriority(prediction, referenceDate)).toBe("normal");
  });

  it("returns critical for near-term buy with projected shortage", () => {
    const prediction = createPrediction({
      predictedDate: "2026-05-03",
      confidence: 0.92,
      recommendation: {
        action: "buy",
        quantity: 40,
        reason: "shortage expected",
      },
    });

    const referenceDate = new Date("2026-05-02T10:00:00.000Z");
    expect(getPredictionPriority(prediction, referenceDate)).toBe("critical");
  });

  it("returns high for medium-term reduce recommendations", () => {
    const prediction = createPrediction({
      predictedDate: "2026-05-04",
      confidence: 0.8,
      recommendation: {
        action: "reduce",
        quantity: 150,
        reason: "overstock risk",
      },
    });

    const referenceDate = new Date("2026-05-02T10:00:00.000Z");
    expect(getPredictionPriority(prediction, referenceDate)).toBe("high");
  });

  it("keeps same priority for the same instant represented in different client timezones", () => {
    const prediction = createPrediction({
      predictedDate: "2026-07-02",
      confidence: 0.92,
      recommendation: {
        action: "buy",
        quantity: 40,
        reason: "shortage expected",
      },
    });

    const instantFromSanFrancisco = new Date("2026-07-01T16:30:00-07:00");
    const instantFromTokyo = new Date("2026-07-02T08:30:00+09:00");

    expect(
      getPredictionPriority(prediction, instantFromSanFrancisco)
    ).toBe("critical");
    expect(getPredictionPriority(prediction, instantFromTokyo)).toBe(
      "critical"
    );
  });

  it("aligns actionable date filtering with restaurant business day boundaries", () => {
    const referenceDate = new Date("2026-05-02T22:30:00.000Z");

    expect(isOnOrAfterRestaurantToday("2026-05-02", referenceDate)).toBe(false);
    expect(isOnOrAfterRestaurantToday("2026-05-03", referenceDate)).toBe(true);
  });
});
