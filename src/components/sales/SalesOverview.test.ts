import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { SalesMetrics } from "../../services/salesService";
import SalesOverview from "./SalesOverview";

const metrics: SalesMetrics = {
  period: { from: "2026-09-01", to: "2026-09-20" }, previousPeriod: { from: "2026-08-12", to: "2026-08-31" },
  provenance: "recorded_sales", status: "no_data", minimumObservedDays: 7,
  observedDays: 0, previousObservedDays: 0, completeServiceDays: 0, incompleteServiceDays: 20,
  previousCompleteServiceDays: 0, previousIncompleteServiceDays: 20,
  totalQuantity: 0, manualQuantity: 0, csvQuantity: 0, posQuantity: 0, ticketZQuantity: 0,
  demoSimulationQuantity: 0, correctedCsvQuantity: 0, averagePerObservedDay: null,
  previousAveragePerObservedDay: null, changePercent: null, items: [], dailyItems: [],
};
const render = (overrides: Partial<SalesMetrics>) => renderToStaticMarkup(createElement(MemoryRouter, {},
  createElement(SalesOverview, { metrics: { ...metrics, ...overrides } })));

describe("sales overview", () => {
  it("does not turn missing sales and averages into zero", () => {
    const html = render({});
    expect(html.match(/class="bilan-kpi-value">—/g)).toHaveLength(3);
    expect(html).toContain("20 jours à compléter");
    expect(html).toContain('href="/sales#sales-start"');
  });
  it("keeps an observed zero change distinct from an unavailable comparison", () => {
    const html = render({ status: "ready", averagePerObservedDay: 12, previousAveragePerObservedDay: 12, changePercent: 0 });
    expect(html).toContain('class="bilan-kpi-value">0 %');
    expect(html).toContain('class="bilan-kpi-value">12');
  });
  it("discloses mixed totals rather than presenting them all as recorded sales", () => {
    const html = render({ status: "insufficient_history", provenance: "mixed", totalQuantity: 30, demoSimulationQuantity: 10 });
    expect(html).toContain("Unités enregistrées et hors bilan");
    expect(html).toContain("10 unités hors bilan restent incluses");
  });
});
