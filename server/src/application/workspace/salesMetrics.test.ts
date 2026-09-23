import { expect, it } from "vitest";
import { calculateSalesMetrics, type MetricSale } from "./salesMetrics.js";

const sale = (serviceDate: string, quantity: number, source: "manual" | "csv" = "manual"): MetricSale =>
  ({ serviceDate, saleItemId: "pizza", saleItemName: "Pizza", quantity, source, revision: 0 });

it("uses only recorded service days and withholds evolution until both periods have enough observations", () => {
  const empty = calculateSalesMetrics([], [], "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(empty.status).toBe("no_data");
  expect(empty.changePercent).toBeNull();
  const sparse = calculateSalesMetrics([sale("2026-09-01", 3)], [sale("2026-08-18", 2)],
    "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(sparse).toMatchObject({ status: "insufficient_history", totalQuantity: 3, observedDays: 1, averagePerObservedDay: null });
  const current = Array.from({ length: 7 }, (_, index) => sale(`2026-09-0${index + 1}`, 4, index === 0 ? "csv" : "manual"));
  const previous = Array.from({ length: 7 }, (_, index) => sale(`2026-08-2${index + 1}`, 2));
  const ready = calculateSalesMetrics(current, previous, "2026-09-01", "2026-09-14", "2026-08-18", "2026-08-31");
  expect(ready).toMatchObject({ status: "ready", observedDays: 7, totalQuantity: 28,
    manualQuantity: 24, csvQuantity: 4, averagePerObservedDay: 4, previousAveragePerObservedDay: 2, changePercent: 100 });
  expect(ready.dailyItems).toHaveLength(7);
});

it("groups quantities by both service date and item and rejects sparse long periods", () => {
  const current = [sale("2026-09-01", 3), sale("2026-09-01", 2),
    { ...sale("2026-09-01", 4), saleItemId: "soup", saleItemName: "Soupe" }];
  const metrics = calculateSalesMetrics(current, [], "2026-09-01", "2026-09-30", "2026-08-02", "2026-08-31");
  expect(metrics.dailyItems).toEqual([
    { serviceDate: "2026-09-01", saleItemId: "pizza", saleItemName: "Pizza", quantity: 5 },
    { serviceDate: "2026-09-01", saleItemId: "soup", saleItemName: "Soupe", quantity: 4 },
  ]);
  expect(metrics.minimumObservedDays).toBe(15);
  const sevenDays = Array.from({ length: 7 }, (_, index) => sale(`2026-09-0${index + 1}`, 1));
  const previous = Array.from({ length: 7 }, (_, index) => sale(`2026-08-1${index + 1}`, 1));
  expect(calculateSalesMetrics(sevenDays, previous, "2026-09-01", "2026-09-30", "2026-08-02", "2026-08-31")
    .status).toBe("insufficient_history");
});
