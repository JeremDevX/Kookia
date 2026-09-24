import { expect, it } from "vitest";
import { evaluateSalesBaseline, type BaselineSale, type BaselineServiceDay } from "./salesBaseline.js";

const asOf = "2026-09-22";
const day = (offset: number) => new Date(Date.parse(asOf) + offset * 86_400_000).toISOString().slice(0, 10);
const history = (id: string, name: string, quantity: (index: number) => number,
  source: BaselineSale["source"] = "manual"): BaselineSale[] =>
  Array.from({ length: 28 }, (_, index) => ({ serviceDate: day(index - 27), saleItemId: id,
    saleItemName: name, quantity: quantity(index), source }));
const completeCalendar = (): BaselineServiceDay[] => Array.from({ length: 28 }, (_, index) => ({
  serviceDate: day(index - 27), status: "open", coverage: "complete", source: "recorded",
}));

it("backtests a rolling seven-day mean without leaking target-day data", () => {
  const result = evaluateSalesBaseline(history("pizza", "Pizza", (index) => index + 1), completeCalendar(), asOf);
  expect(result).toMatchObject({ provenance: "recorded_sales", model: "rolling_mean_7_v1",
    status: "experimental", asOfDate: asOf, forecastDate: "2026-09-23", requiredConsecutiveDays: 28 });
  expect(result.items).toEqual([{ saleItemId: "pizza", saleItemName: "Pizza", forecastQuantity: 25,
    backtest: { from: "2026-09-16", to: asOf, days: 7, meanAbsoluteError: 4,
      weightedAbsolutePercentageError: 16 } }]);
});

it("treats an absent item line as zero only when the whole service day is complete", () => {
  const complete = history("pizza", "Pizza", () => 10);
  const incomplete = history("soup", "Soupe", () => 2).filter((row) => row.serviceDate !== day(-8));
  const result = evaluateSalesBaseline([...complete, ...incomplete], completeCalendar(), asOf);
  expect(result.observedItemCount).toBe(2);
  expect(result.items.map((item) => [item.saleItemId, item.forecastQuantity])).toEqual([["pizza", 10], ["soup", 2]]);
  const partialCalendar = completeCalendar().map((serviceDay) => serviceDay.serviceDate === day(-8)
    ? { ...serviceDay, coverage: "partial" as const } : serviceDay);
  expect(evaluateSalesBaseline([...complete, ...incomplete], partialCalendar, asOf))
    .toMatchObject({ status: "insufficient_history", items: [], completeServiceDays: 27, incompleteDates: [day(-8)] });
  expect(evaluateSalesBaseline([], [], asOf)).toMatchObject({ status: "no_data", items: [], completeServiceDays: 0 });
});

it("labels a complete simulated baseline as demonstration data", () => {
  const simulatedCalendar = completeCalendar().map((serviceDay) => ({ ...serviceDay, source: "demo_simulation" as const }));
  expect(evaluateSalesBaseline(history("pizza", "Pizza", () => 12, "demo_simulation"), simulatedCalendar, asOf))
    .toMatchObject({ provenance: "demo_simulation", status: "experimental", observedItemCount: 1, excludedSimulationRows: 0 });
});

it("excludes simulated rows from a mixed recorded backtest", () => {
  const recorded = history("pizza", "Pizza", (index) => index + 1);
  const simulated = history("pizza", "Pizza", () => 1000, "demo_simulation");
  expect(evaluateSalesBaseline([...recorded, ...simulated], completeCalendar(), asOf))
    .toMatchObject({ provenance: "mixed", observedItemCount: 1, excludedSimulationRows: 28,
      mixedSourceWindow: true, status: "insufficient_history", items: [] });
});

it("accepts a closed and fully reviewed date in the calendar without requiring a sale line", () => {
  const days = completeCalendar().map((serviceDay) => serviceDay.serviceDate === day(-1)
    ? { ...serviceDay, status: "closed" as const } : serviceDay);
  expect(evaluateSalesBaseline(history("pizza", "Pizza", (index) => index + 1), days, asOf))
    .toMatchObject({ status: "experimental", completeServiceDays: 28, openServiceDays: 27 });
});

it("withholds the backtest when the calendar itself mixes demo and recorded coverage", () => {
  const days = completeCalendar().map((serviceDay, index) => index === 0
    ? { ...serviceDay, source: "mixed" as const } : serviceDay);
  expect(evaluateSalesBaseline(history("pizza", "Pizza", () => 10), days, asOf))
    .toMatchObject({ mixedSourceWindow: true, status: "insufficient_history", items: [] });
});
