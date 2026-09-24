import { expect, it } from "vitest";
import { calculateSalesMetrics, type MetricSale } from "./salesMetrics.js";

const sale = (serviceDate: string, quantity: number, source: "manual" | "csv" | "demo_simulation" = "manual"): MetricSale =>
  ({ serviceDate, saleItemId: "pizza", saleItemName: "Pizza", quantity, source, revision: 0 });
const reviewedDays = (from: string, count: number) => Array.from({ length: count }, (_, index) => ({
  serviceDate: new Date(Date.parse(from) + index * 86_400_000).toISOString().slice(0, 10),
  status: "open" as const, coverage: "complete" as const,
}));

it("uses only recorded service days and withholds evolution until both periods have enough observations", () => {
  const empty = calculateSalesMetrics([], [], [], [], "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(empty.status).toBe("no_data");
  expect(empty.changePercent).toBeNull();
  const sparse = calculateSalesMetrics([sale("2026-09-01", 3)], [sale("2026-08-18", 2)], [], [],
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(sparse).toMatchObject({ status: "insufficient_history", totalQuantity: 3, observedDays: 0, averagePerObservedDay: null });
  const current = Array.from({ length: 7 }, (_, index) => sale(`2026-09-0${index + 1}`, 4, index === 0 ? "csv" : "manual"));
  const previous = Array.from({ length: 7 }, (_, index) => sale(new Date(Date.parse("2026-08-25") + index * 86_400_000).toISOString().slice(0, 10), 2));
  const ready = calculateSalesMetrics(current, previous, reviewedDays("2026-09-01", 7), reviewedDays("2026-08-25", 7),
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(ready).toMatchObject({ status: "ready", observedDays: 7, totalQuantity: 28,
    manualQuantity: 24, csvQuantity: 4, averagePerObservedDay: 4, previousAveragePerObservedDay: 2, changePercent: 100 });
  expect(ready.dailyItems).toHaveLength(7);
});

it("groups quantities by both service date and item and rejects sparse long periods", () => {
  const current = [sale("2026-09-01", 3), sale("2026-09-01", 2),
    { ...sale("2026-09-01", 4), saleItemId: "soup", saleItemName: "Soupe" }];
  const metrics = calculateSalesMetrics(current, [], reviewedDays("2026-09-01", 1), [],
    "2026-09-01", "2026-09-30", "2026-08-02", "2026-08-31");
  expect(metrics.dailyItems).toEqual([
    { serviceDate: "2026-09-01", saleItemId: "pizza", saleItemName: "Pizza", quantity: 5 },
    { serviceDate: "2026-09-01", saleItemId: "soup", saleItemName: "Soupe", quantity: 4 },
  ]);
  expect(metrics.minimumObservedDays).toBe(15);
  const sevenDays = Array.from({ length: 7 }, (_, index) => sale(`2026-09-0${index + 1}`, 1));
  const previous = Array.from({ length: 7 }, (_, index) => sale(`2026-08-1${index + 1}`, 1));
  expect(calculateSalesMetrics(sevenDays, previous, reviewedDays("2026-09-01", 7), reviewedDays("2026-08-02", 7),
    "2026-09-01", "2026-09-30", "2026-08-02", "2026-08-31")
    .status).toBe("insufficient_history");
});

it("keeps simulated sales separate from manual and CSV totals", () => {
  const current = Array.from({ length: 7 }, (_, index) => sale(`2026-09-0${index + 1}`, 5, "demo_simulation"));
  const previous = Array.from({ length: 7 }, (_, index) => sale(new Date(Date.parse("2026-08-25") + index * 86_400_000).toISOString().slice(0, 10), 3));
  expect(calculateSalesMetrics(current, previous, reviewedDays("2026-09-01", 7), reviewedDays("2026-08-25", 7),
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31"))
    .toMatchObject({ provenance: "mixed", totalQuantity: 35, manualQuantity: 0, csvQuantity: 0,
      demoSimulationQuantity: 35, status: "ready" });
});

it("counts fully reviewed zero-sale days but never averages partial days", () => {
  const current = Array.from({ length: 6 }, (_, index) =>
    sale(new Date(Date.parse("2026-09-02") + index * 86_400_000).toISOString().slice(0, 10), 4));
  const complete = [{ serviceDate: "2026-09-01", status: "open" as const, coverage: "complete" as const },
    ...reviewedDays("2026-09-02", 6)];
  const previous = reviewedDays("2026-08-25", 7);
  const result = calculateSalesMetrics(current, [], complete, previous,
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(result).toMatchObject({ status: "ready", observedDays: 7, totalQuantity: 24, averagePerObservedDay: 3.4 });
  const partial = [{ serviceDate: "2026-09-01", status: "open" as const, coverage: "partial" as const },
    ...reviewedDays("2026-09-02", 6)];
  const withheld = calculateSalesMetrics([...current, sale("2026-09-01", 99)], [], partial, previous,
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(withheld).toMatchObject({ status: "insufficient_history", totalQuantity: 123, observedDays: 6, averagePerObservedDay: null });
});
