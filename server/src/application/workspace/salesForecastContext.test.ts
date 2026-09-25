import { expect, it } from "vitest";
import { evaluateSalesBaseline } from "./salesBaseline.js";
import { evaluateSalesForecastContext, type ForecastContextFixture } from "./salesForecastContext.js";

const asOfDate = "2026-09-22";
const day = (offset: number) => new Date(Date.parse(asOfDate) + offset * 86_400_000).toISOString().slice(0, 10);
const baseline = () => evaluateSalesBaseline(
  Array.from({ length: 28 }, (_, index) => ({ serviceDate: day(index - 27), saleItemId: "fixture-item",
    saleItemName: "Article fixture", quantity: 10, source: "manual" as const })),
  Array.from({ length: 28 }, (_, index) => ({ serviceDate: day(index - 27), status: "open" as const,
    coverage: "complete" as const, source: "recorded" as const })), asOfDate);

const context: ForecastContextFixture = {
  position: { kind: "fixture_position", label: "Position fictive", latitude: 0, longitude: 0,
    verifiedAt: "2026-09-22T12:00:00.000Z" },
  weather: { source: "fixture", capturedAt: "2026-09-23T07:00:00.000Z", validFrom: "2026-09-23", validThrough: "2026-09-23" },
  events: { source: "fixture", capturedAt: "2026-09-23T07:00:00.000Z", validFrom: "2026-09-23", validThrough: "2026-09-23" },
  historicalEmissions: { source: "fixture", capturedAt: "2026-09-23T07:00:00.000Z",
    validFrom: "2026-09-16", validThrough: "2026-09-22" },
};

it("accepts timestamped fixture context for contract checks but leaves the F1 quantity untouched", () => {
  const f1 = baseline();
  const result = evaluateSalesForecastContext(f1, context, new Date("2026-09-23T08:00:00.000Z"));
  expect(result).toEqual({ status: "fixture_ready", position: "fixture_position", weather: "fresh", events: "fresh",
    historicalEmissions: "fresh", forecastSource: "f1", contextualAdjustmentApplied: false });
  expect(f1.items[0].forecastQuantity).toBe(10);
});

it("marks an expired context stale and only falls back to F1 when its history is valid", () => {
  const staleContext = { ...context, weather: { ...context.weather!, validThrough: "2026-09-22" } };
  const evaluatedAt = new Date("2026-09-23T08:00:00.000Z");
  expect(evaluateSalesForecastContext(baseline(), staleContext, evaluatedAt))
    .toMatchObject({ status: "stale", weather: "stale", forecastSource: "f1", contextualAdjustmentApplied: false });
  const noHistory = evaluateSalesBaseline([], [], asOfDate);
  expect(evaluateSalesForecastContext(noHistory, staleContext, evaluatedAt))
    .toMatchObject({ status: "stale", weather: "stale", forecastSource: "none", contextualAdjustmentApplied: false });
});

it("treats a missing contextual source as unavailable while preserving a valid F1 fallback", () => {
  expect(evaluateSalesForecastContext(baseline(), { ...context, events: null }, new Date("2026-09-23T08:00:00.000Z")))
    .toMatchObject({ status: "unavailable", events: "not_connected", forecastSource: "f1",
      contextualAdjustmentApplied: false });
});

it("rejects a fixture position outside geographic bounds", () => {
  const result = evaluateSalesForecastContext(baseline(), {
    ...context, position: { ...context.position, latitude: 91 },
  }, new Date("2026-09-23T08:00:00.000Z"));
  expect(result).toMatchObject({ status: "unavailable", position: "unverified", forecastSource: "f1" });
});
