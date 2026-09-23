export interface MetricSale {
  serviceDate: string; saleItemId: string; saleItemName: string;
  quantity: number; source: "manual" | "csv" | "demo_simulation"; revision: number;
}

const MIN_OBSERVED_DAYS = 7;
const round = (value: number) => Math.round(value * 10) / 10;

export function calculateSalesMetrics(current: MetricSale[], previous: MetricSale[], from: string, to: string,
  previousFrom: string, previousTo: string) {
  const byDate = new Map<string, number>();
  const byItem = new Map<string, { saleItemId: string; saleItemName: string; quantity: number }>();
  const byDateAndItem = new Map<string, { serviceDate: string; saleItemId: string; saleItemName: string; quantity: number }>();
  let totalQuantity = 0, manualQuantity = 0, csvQuantity = 0, demoSimulationQuantity = 0, correctedCsvQuantity = 0;
  for (const sale of current) {
    totalQuantity += sale.quantity;
    byDate.set(sale.serviceDate, (byDate.get(sale.serviceDate) ?? 0) + sale.quantity);
    const item = byItem.get(sale.saleItemId) ?? { saleItemId: sale.saleItemId, saleItemName: sale.saleItemName, quantity: 0 };
    item.quantity += sale.quantity;
    byItem.set(sale.saleItemId, item);
    const dateItemKey = `${sale.serviceDate}:${sale.saleItemId}`;
    const dateItem = byDateAndItem.get(dateItemKey) ?? { serviceDate: sale.serviceDate, saleItemId: sale.saleItemId,
      saleItemName: sale.saleItemName, quantity: 0 };
    dateItem.quantity += sale.quantity;
    byDateAndItem.set(dateItemKey, dateItem);
    if (sale.source === "manual") manualQuantity += sale.quantity;
    else if (sale.source === "csv") { csvQuantity += sale.quantity; if (sale.revision > 0) correctedCsvQuantity += sale.quantity; }
    else demoSimulationQuantity += sale.quantity;
  }
  const sources = new Set([...current, ...previous].map((sale) => sale.source));
  const provenance = sources.has("demo_simulation") ? sources.size > 1 ? "mixed" : "demo_simulation" : "recorded_sales";
  const previousDays = new Set(previous.map((sale) => sale.serviceDate)).size;
  const previousQuantity = previous.reduce((sum, sale) => sum + sale.quantity, 0);
  const observedDays = byDate.size;
  const periodDays = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  const minimumObservedDays = Math.max(MIN_OBSERVED_DAYS, Math.ceil(periodDays / 2));
  const status = observedDays === 0 ? "no_data" : observedDays < minimumObservedDays || previousDays < minimumObservedDays
    ? "insufficient_history" : "ready";
  const averagePerObservedDay = status === "ready" ? round(totalQuantity / observedDays) : null;
  const previousAverage = status === "ready" ? previousQuantity / previousDays : null;
  return {
    period: { from, to }, previousPeriod: { from: previousFrom, to: previousTo }, provenance,
    status, minimumObservedDays, observedDays, previousObservedDays: previousDays,
    totalQuantity, manualQuantity, csvQuantity, demoSimulationQuantity, correctedCsvQuantity,
    averagePerObservedDay,
    previousAveragePerObservedDay: previousAverage === null ? null : round(previousAverage),
    changePercent: averagePerObservedDay === null || previousAverage === null || previousAverage === 0
      ? null : round((totalQuantity / observedDays / previousAverage - 1) * 100),
    items: [...byItem.values()].sort((a, b) => b.quantity - a.quantity || a.saleItemName.localeCompare(b.saleItemName, "fr")),
    dailyItems: [...byDateAndItem.values()].sort((a, b) =>
      b.serviceDate.localeCompare(a.serviceDate) || a.saleItemName.localeCompare(b.saleItemName, "fr")),
  };
}
