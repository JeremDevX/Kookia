import { describe, expect, it } from "vitest";
import { isCurrentPrediction } from "./predictionPolicy.js";

describe("isCurrentPrediction", () => {
  it("uses the restaurant day, including the Paris midnight boundary", () => {
    const now = new Date("2026-05-02T22:30:00.000Z");
    expect(isCurrentPrediction(new Date("2026-05-02T00:00:00.000Z"), now)).toBe(false);
    expect(isCurrentPrediction(new Date("2026-05-03T00:00:00.000Z"), now)).toBe(true);
  });
});
