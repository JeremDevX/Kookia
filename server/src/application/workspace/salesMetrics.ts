export interface MetricSale {
  serviceDate: string; saleItemId: string; saleItemName: string;
  quantity: number; source: "manual" | "csv" | "pos" | "ticket_z" | "demo_simulation"; revision: number;
}
export interface MetricServiceDay {
  serviceDate: string;
  status: "open" | "closed";
  coverage: "complete" | "partial" | "missing";
}

const MIN_OBSERVED_DAYS = 7;
const round = (value: number) => Math.round(value * 10) / 10;

export function calculateSalesMetrics(current: MetricSale[], previous: MetricSale[], currentCalendar: MetricServiceDay[],
  previousCalendar: MetricServiceDay[], from: string, to: string, previousFrom: string, previousTo: string) {
  const byDate = new Map<string, number>();
  const byItem = new Map<string, { saleItemId: string; saleItemName: string; quantity: number }>();
  const byDateAndItem = new Map<string, { serviceDate: string; saleItemId: string; saleItemName: string; quantity: number }>();
  let totalQuantity = 0, manualQuantity = 0, csvQuantity = 0, posQuantity = 0, ticketZQuantity = 0,
    demoSimulationQuantity = 0, correctedCsvQuantity = 0;
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
    else if (sale.source === "pos") posQuantity += sale.quantity;
    else if (sale.source === "ticket_z") ticketZQuantity += sale.quantity;
    else demoSimulationQuantity += sale.quantity;
  }
  const sources = new Set([...current, ...previous].map((sale) => sale.source));
  const provenance = sources.has("demo_simulation") ? sources.size > 1 ? "mixed" : "demo_simulation" : "recorded_sales";
  const currentReviewedDates = new Set(currentCalendar.filter((day) => day.status === "open" && day.coverage === "complete")
    .map((day) => day.serviceDate));
  const previousReviewedDates = new Set(previousCalendar.filter((day) => day.status === "open" && day.coverage === "complete")
    .map((day) => day.serviceDate));
  const observedDays = currentReviewedDates.size;
  const previousDays = previousReviewedDates.size;
  const previousReviewedQuantity = previous.filter((sale) => previousReviewedDates.has(sale.serviceDate))
    .reduce((sum, sale) => sum + sale.quantity, 0);
  const reviewedQuantity = current.filter((sale) => currentReviewedDates.has(sale.serviceDate))
    .reduce((sum, sale) => sum + sale.quantity, 0);
  const periodDays = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  const previousPeriodDays = (Date.parse(previousTo) - Date.parse(previousFrom)) / 86_400_000 + 1;
  const completeServiceDays = currentCalendar.filter((day) => day.coverage === "complete").length;
  const previousCompleteServiceDays = previousCalendar.filter((day) => day.coverage === "complete").length;
  const incompleteServiceDays = periodDays - completeServiceDays;
  const previousIncompleteServiceDays = previousPeriodDays - previousCompleteServiceDays;
  const minimumObservedDays = Math.max(MIN_OBSERVED_DAYS, Math.ceil(periodDays / 2));
  const hasCurrentEvidence = current.length > 0 || currentCalendar.length > 0;
  const status = !hasCurrentEvidence ? "no_data" : observedDays < minimumObservedDays || previousDays < Math.max(
    MIN_OBSERVED_DAYS, Math.ceil(previousPeriodDays / 2))
    ? "insufficient_history" : "ready";
  const averagePerObservedDay = status === "ready" ? round(reviewedQuantity / observedDays) : null;
  const previousAverage = status === "ready" ? previousReviewedQuantity / previousDays : null;
  return {
    period: { from, to }, previousPeriod: { from: previousFrom, to: previousTo }, provenance,
    status, minimumObservedDays, observedDays, previousObservedDays: previousDays,
    completeServiceDays, incompleteServiceDays, previousCompleteServiceDays, previousIncompleteServiceDays,
    totalQuantity, manualQuantity, csvQuantity, posQuantity, ticketZQuantity, demoSimulationQuantity, correctedCsvQuantity,
    averagePerObservedDay,
    previousAveragePerObservedDay: previousAverage === null ? null : round(previousAverage),
    changePercent: averagePerObservedDay === null || previousAverage === null || previousAverage === 0
      ? null : round((reviewedQuantity / observedDays / previousAverage - 1) * 100),
    items: [...byItem.values()].sort((a, b) => b.quantity - a.quantity || a.saleItemName.localeCompare(b.saleItemName, "fr")),
    dailyItems: [...byDateAndItem.values()].sort((a, b) =>
      b.serviceDate.localeCompare(a.serviceDate) || a.saleItemName.localeCompare(b.saleItemName, "fr")),
  };
}
