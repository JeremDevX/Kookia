export interface BaselineSale {
  serviceDate: string;
  saleItemId: string;
  saleItemName: string;
  quantity: number;
  source: "manual" | "csv" | "demo_simulation";
}

export interface BaselineServiceDay {
  serviceDate: string;
  status: "open" | "closed";
  coverage: "complete" | "partial" | "missing";
}

const HISTORY_DAYS = 28;
const LOOKBACK_DAYS = 7;
const EVALUATION_DAYS = 7;
const day = (date: string, offset: number) =>
  new Date(Date.parse(date) + offset * 86_400_000).toISOString().slice(0, 10);
const mean = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const round = (value: number) => Math.round(value * 10) / 10;

export function evaluateSalesBaseline(sales: BaselineSale[], serviceDays: BaselineServiceDay[], asOfDate: string) {
  const dates = Array.from({ length: HISTORY_DAYS }, (_, index) => day(asOfDate, index - HISTORY_DAYS + 1));
  const serviceDayByDate = new Map(serviceDays.map((serviceDay) => [serviceDay.serviceDate, serviceDay]));
  const incompleteDates = dates.filter((date) => serviceDayByDate.get(date)?.coverage !== "complete");
  const completeServiceDays = dates.filter((date) => serviceDayByDate.get(date)?.coverage === "complete").length;
  const openServiceDays = dates.filter((date) => {
    const serviceDay = serviceDayByDate.get(date);
    return serviceDay?.status === "open" && serviceDay.coverage === "complete";
  }).length;
  const byItem = new Map<string, { saleItemId: string; saleItemName: string; byDate: Map<string, number> }>();
  const sources = new Set<string>();
  for (const sale of sales) {
    if (!dates.includes(sale.serviceDate)) continue;
    sources.add(sale.source);
    const item = byItem.get(sale.saleItemId) ?? { saleItemId: sale.saleItemId, saleItemName: sale.saleItemName,
      byDate: new Map<string, number>() };
    item.byDate.set(sale.serviceDate, (item.byDate.get(sale.serviceDate) ?? 0) + sale.quantity);
    byItem.set(sale.saleItemId, item);
  }
  const items = incompleteDates.length ? [] : [...byItem.values()].flatMap((item) => {
    const quantities = dates.map((date) => item.byDate.get(date) ?? 0);
    const errors = Array.from({ length: EVALUATION_DAYS }, (_, index) => {
      const target = HISTORY_DAYS - EVALUATION_DAYS + index;
      return Math.abs(mean(quantities.slice(target - LOOKBACK_DAYS, target)) - quantities[target]);
    });
    const actualTotal = quantities.slice(-EVALUATION_DAYS).reduce((sum, value) => sum + value, 0);
    return [{ saleItemId: item.saleItemId, saleItemName: item.saleItemName,
      forecastQuantity: mean(quantities.slice(-LOOKBACK_DAYS)),
      backtest: { from: dates[HISTORY_DAYS - EVALUATION_DAYS], to: asOfDate,
        days: EVALUATION_DAYS, meanAbsoluteError: round(errors.reduce((sum, error) => sum + error, 0) / EVALUATION_DAYS),
        weightedAbsolutePercentageError: actualTotal === 0 ? null : round(errors.reduce((sum, error) => sum + error, 0) / actualTotal * 100) } }];
  }).sort((a, b) => a.saleItemName.localeCompare(b.saleItemName, "fr"));
  const provenance = sources.has("demo_simulation") ? sources.size > 1 ? "mixed" : "demo_simulation" : "recorded_sales";
  return {
    provenance, model: "rolling_mean_7_v1" as const,
    asOfDate, forecastDate: day(asOfDate, 1), historyFrom: dates[0],
    requiredConsecutiveDays: HISTORY_DAYS, lookbackDays: LOOKBACK_DAYS, evaluationDays: EVALUATION_DAYS,
    completeServiceDays, openServiceDays, incompleteDates,
    status: byItem.size === 0 ? "no_data" as const : incompleteDates.length > 0 ? "insufficient_history" as const : "experimental" as const,
    observedItemCount: byItem.size, items,
  };
}
