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
      weightedAbsolutePercentageError: 16 }, recipeProjection: { status: "unmapped", reason: expect.any(String) },
    recipeBacktest: { days: 7, mappedDays: 0, missingMappingDays: 7, missingDatedRecipeDays: 0, versionsUsed: [], ingredients: [] } }]);
});

it("uses only the mapping and dated recipe version effective on each backtest day", () => {
  const serviceDay = (index: number) => day(index - 27);
  const mappings = [
    { saleItemId: "pizza", recipeId: "old-menu", revision: 1, effectiveFrom: serviceDay(0), portionsPerItem: 1 },
    { saleItemId: "pizza", recipeId: "new-menu", revision: 2, effectiveFrom: serviceDay(28), portionsPerItem: 2 },
  ];
  const versions = [
    { recipeId: "old-menu", version: 1, effectiveFrom: serviceDay(0), name: "Pizza initiale", yieldPortions: 10,
      ingredients: [{ productId: "flour", productName: "Farine", unit: "kg", quantity: 5 }] },
    { recipeId: "old-menu", version: 2, effectiveFrom: serviceDay(24), name: "Pizza corrigée", yieldPortions: 10,
      ingredients: [{ productId: "flour", productName: "Farine", unit: "kg", quantity: 20 }] },
    { recipeId: "old-menu", version: 99, effectiveFrom: null, name: "Version legacy non datée", yieldPortions: 1,
      ingredients: [{ productId: "flour", productName: "Farine", unit: "kg", quantity: 999 }] },
    { recipeId: "old-menu", version: 3, effectiveFrom: serviceDay(28), name: "Recette future", yieldPortions: 10,
      ingredients: [{ productId: "flour", productName: "Farine", unit: "kg", quantity: 100 }] },
    { recipeId: "new-menu", version: 1, effectiveFrom: serviceDay(28), name: "Nouvelle carte", yieldPortions: 2,
      ingredients: [{ productId: "cheese", productName: "Fromage", unit: "kg", quantity: 4 }] },
  ];
  const result = evaluateSalesBaseline(history("pizza", "Pizza", () => 10), completeCalendar(), asOf, mappings, versions);
  const item = result.items[0];
  expect(item.recipeProjection).toMatchObject({ status: "mapped", recipeId: "new-menu", recipeVersion: 1,
    recipeEffectiveFrom: serviceDay(28), forecastPortions: 20, ingredients: [{ productId: "cheese", quantity: 40 }] });
  expect(item.recipeBacktest.versionsUsed).toHaveLength(7);
  expect(item.recipeBacktest.versionsUsed.filter((usage) => usage.serviceDate < serviceDay(24)).every((usage) =>
    usage.recipeId === "old-menu" && usage.recipeVersion === 1)).toBe(true);
  expect(item.recipeBacktest.versionsUsed.filter((usage) => usage.serviceDate >= serviceDay(24)).every((usage) =>
    usage.recipeId === "old-menu" && usage.recipeVersion === 2)).toBe(true);
  expect(item.recipeBacktest.versionsUsed.every((usage) => usage.recipeEffectiveFrom <= usage.serviceDate)).toBe(true);
  expect(item.recipeBacktest.versionsUsed.some((usage) => usage.recipeVersion === 3 || usage.recipeId === "new-menu")).toBe(false);
  expect(item.recipeBacktest.mappedDays).toBe(7);
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
