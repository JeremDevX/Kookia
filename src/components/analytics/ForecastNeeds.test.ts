import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { OperationalForecast } from "../../../shared/operationalForecast";
import { ForecastNeedsContent } from "./ForecastNeeds";
import { forecastWeek } from "./forecastNeedsDate";

const forecast: OperationalForecast = { fromDate: "2026-12-29", throughDate: "2027-01-04", asOfDate: "2026-12-28", provenance: "recorded_sales", excludedServices: 2,
  ingredientNeeds: [{ productId: "p", productName: "Tomate", unit: "kg", quantity: 2.5, sources: [] }], blockers: ["2026-12-30 midi : Carte du service non renseignée."], assumptions: ["Estimations sans mouvement de stock."], services: [] };
const render = (result: Parameters<typeof ForecastNeedsContent>[0]["result"]) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(ForecastNeedsContent, { result, retry: () => {} })));

describe("Besoins prévus", () => {
  it("couvre sept jours inclus en heure de Paris, même au changement d’année", () => {
    expect(forecastWeek(new Date("2026-12-28T22:59:00Z"))).toEqual({ from: "2026-12-28", to: "2027-01-03" });
    expect(forecastWeek(new Date("2026-12-28T23:30:00Z"))).toEqual({ from: "2026-12-29", to: "2027-01-04" });
  });
  it("présente le chargement et une erreur récupérable", () => {
    expect(render({ status: "loading" })).toContain("Calcul des besoins");
    const html = render({ status: "error", message: "Connexion perdue" });
    expect(html).toContain("Connexion perdue"); expect(html).toContain("Réessayer");
  });
  it("signale les résultats partiels et leurs limites", () => {
    const html = render({ status: "success", forecast });
    expect(html).toContain("Estimation partielle"); expect(html).toContain("Carte du service non renseignée");
    expect(html).toContain("<th scope=\"col\">Produit</th>"); expect(html).toContain("<th scope=\"col\">Besoin estimé</th>");
    expect(html).toContain("<th scope=\"row\">Tomate</th><td>2,5 kg</td>"); expect(html).toContain("ne tiennent pas compte du stock");
    expect(html).toContain("ventes enregistrées"); expect(html).toContain("29/12/2026");
  });
  it("explique un ajustement météo appliqué", () => {
    const adjusted: OperationalForecast = { ...forecast, services: [{ date: "2026-12-29", slot: "lunch", plannedOpen: true,
      menuRevision: 1, forecastKey: "forecast", items: [], ingredientNeeds: [], blockers: [], mix: [],
      weatherAdjustment: { policyVersion: "terrace-weather-v1", hasTerrace: true, status: "applied", percent: -15,
        reason: "Pluie prévue.", weather: null } }] };
    const html = render({ status: "success", forecast: adjusted });
    expect(html).toContain("Ajustements météo appliqués"); expect(html).toContain("-15 %");
    expect(html).toContain("non calibré");
  });
  it("ne transforme pas une absence de résultat en besoin nul", () => {
    const html = render({ status: "success", forecast: { ...forecast, ingredientNeeds: [] } });
    expect(html).toContain("Aucun besoin calculable"); expect(html).toContain("Estimation partielle");
  });
});
