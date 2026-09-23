import { expect, it } from "vitest";
import { evaluateSalesBaseline, type BaselineSale } from "./salesBaseline.js";

const asOf = "2026-09-22";
const day = (offset: number) => new Date(Date.parse(asOf) + offset * 86_400_000).toISOString().slice(0, 10);
const history = (id: string, name: string, quantity: (index: number) => number,
  source: BaselineSale["source"] = "manual"): BaselineSale[] =>
  Array.from({ length: 28 }, (_, index) => ({ serviceDate: day(index - 27), saleItemId: id,
    saleItemName: name, quantity: quantity(index), source }));

it("backtests a rolling seven-day mean without leaking target-day data", () => {
  const result = evaluateSalesBaseline(history("pizza", "Pizza", (index) => index + 1), asOf);
  expect(result).toMatchObject({ provenance: "recorded_sales", model: "rolling_mean_7_v1",
    status: "experimental", asOfDate: asOf, forecastDate: "2026-09-23", requiredConsecutiveDays: 28 });
  expect(result.items).toEqual([{ saleItemId: "pizza", saleItemName: "Pizza", forecastQuantity: 25,
    backtest: { from: "2026-09-16", to: asOf, days: 7, meanAbsoluteError: 4,
      weightedAbsolutePercentageError: 16 } }]);
});

it("withholds a forecast for an incomplete item and never treats missing days as zero", () => {
  const complete = history("pizza", "Pizza", () => 10);
  const incomplete = history("soup", "Soupe", () => 2).filter((row) => row.serviceDate !== day(-8));
  const result = evaluateSalesBaseline([...complete, ...incomplete], asOf);
  expect(result.observedItemCount).toBe(2);
  expect(result.items).toEqual([{ saleItemId: "pizza", saleItemName: "Pizza", forecastQuantity: 10,
    backtest: { from: "2026-09-16", to: asOf, days: 7, meanAbsoluteError: 0,
      weightedAbsolutePercentageError: 0 } }]);
  expect(evaluateSalesBaseline(incomplete, asOf)).toMatchObject({ status: "insufficient_history", items: [] });
  expect(evaluateSalesBaseline([], asOf)).toMatchObject({ status: "no_data", items: [] });
});

it("labels a complete simulated baseline as demonstration data", () => {
  expect(evaluateSalesBaseline(history("pizza", "Pizza", () => 12, "demo_simulation"), asOf))
    .toMatchObject({ provenance: "demo_simulation", status: "experimental", observedItemCount: 1 });
});
