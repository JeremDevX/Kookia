import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OperationalForecast } from "../../../shared/operationalForecast";
import ServiceForecastPanel, { ForecastPanelContent } from "./ServiceForecastPanel";
import { selectedForecastService } from "./forecastPresentation";
const forecast: OperationalForecast = { fromDate: "2026-10-01", throughDate: "2026-10-01", asOfDate: "2026-09-27", provenance: "recorded_sales", excludedServices: 3,
  ingredientNeeds: [], blockers: ["Carte à qualifier"], assumptions: ["Ventes complètes uniquement"], services: [
    { date: "2026-10-01", slot: "lunch", plannedOpen: true, menuRevision: 2, forecastKey: "a".repeat(64), ingredientNeeds: [], blockers: [], mix: [{ category: "Entrée", portionsPerCover: 0.7, observedCovers: 100, services: 4 }],
      items: [{ entryId: "entry", name: "Salade", saleItemId: "sale", category: "Entrée", quantity: null, observations: 2, model: "insufficient", observedMin: null, observedMax: null, deviation: null }] },
    { date: "2026-10-01", slot: "dinner", plannedOpen: false, menuRevision: 0, forecastKey: "b".repeat(64), ingredientNeeds: [], blockers: [], mix: [], items: [] },
  ] };
describe("service forecasts", () => {
  it("filters the selected service without mistaking whole-day ingredients for one service", () => {
    expect(selectedForecastService(forecast, "2026-10-01", "dinner")?.plannedOpen).toBe(false);
    expect(selectedForecastService(forecast, "2026-10-02", "lunch")).toBeNull();
    const html = renderToStaticMarkup(createElement(ForecastPanelContent, { forecast, date: "2026-10-01", slot: "lunch" }));
    expect(html).toContain("prévision indisponible"); expect(html).toContain("dispersion inconnue"); expect(html).toContain("2 services observés");
    expect(html).toContain("Ventes enregistrées"); expect(html).toContain("3 services exclus"); expect(html).toContain("ne sont pas des pourcentages exclusifs");
    expect(html).toContain("midi et soir"); expect(html).toContain("n’est pas une garantie de précision");
  });
  it("does not offer a retrospective forecast as an observed fact", () => {
    const html = renderToStaticMarkup(createElement(ServiceForecastPanel, { date: "2020-01-01", slot: "lunch" }));
    expect(html).toContain("aujourd’hui et les dates futures"); expect(html).not.toContain("Recalculer les prévisions");
  });
});
