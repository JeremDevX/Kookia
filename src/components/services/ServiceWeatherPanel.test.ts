import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ServiceWeatherPanel, { WeatherDecisionSummary, WeatherSummary } from "./ServiceWeatherPanel";
import ConnectionsSettings from "../settings/ConnectionsSettings";
import type { ServiceWeather } from "../../../shared/serviceWeather";
import { weatherForDisplay } from "../../features/services/useServiceWeather";
import { readServiceContext, serviceContextHref } from "../../features/services/serviceNavigation";

const weather: ServiceWeather = { serviceDate: "2026-09-28", slot: "lunch", reason: "Prévision incomplète", status: "partial",
  source: "Open-Meteo", provenance: "fixture", position: null, window: null, hours: [], completeHours: 0, expectedHours: 2,
  units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" }, issuedAt: null, expiresAt: "2026-09-28T14:00:00Z",
  fetchedAt: "2026-09-28T08:00:00Z", contextRef: "a".repeat(64),
  summary: { weatherCode: 45, temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: null, maxWindSpeed: 15 } };
describe("weather presentation and service navigation", () => {
  it("preserves valid context and rejects invalid dates or arbitrary navigation targets", () => {
    const context = { date: "2026-09-28", slot: "dinner" as const };
    const href = serviceContextHref("/settings", context);
    expect(readServiceContext(new URL(href, "https://fixture.invalid").searchParams)).toEqual(context);
    const connections = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ConnectionsSettings, { onWeatherSettings: () => {} })));
    expect(connections).toContain('aria-haspopup="dialog"');
    expect(connections).toContain("Régler la météo");
    for (const query of ["serviceDate=2026-02-30&serviceSlot=lunch", "serviceDate=2026-09-28&serviceSlot=night", "next=https://external.invalid"]) {
      expect(readServiceContext(new URLSearchParams(query))).toBeNull();
    }
  });
  it("shows unknown values and honest hourly probabilities with attribution inside the weather dialog", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ServiceWeatherPanel, {
      date: weather.serviceDate, state: { loading: false, weather, error: "", reload: () => {} } })));
    expect(html).toContain("probabilité horaire maximale");
    expect(html).toContain("Inconnu %");
    expect(html).toContain("n’est pas celle de l’ensemble de la période affichée");
    expect(html).toContain("https://open-meteo.com/"); expect(html).toContain("https://www.geonames.org/");
    expect(html).not.toContain("/settings");
    expect(html).toContain("Le chef garde la validation des quantités");
  });
  it("makes loading/errors nonblocking and distinguishes missing decision context from legacy snapshots", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ServiceWeatherPanel, {
      date: weather.serviceDate, state: { loading: false, weather: null, error: "Indisponible.", reload: () => {} } })));
    expect(html).toContain('role="alert"'); expect(html).toContain("continuer sans météo"); expect(html).toContain("Réessayer");
    expect(renderToStaticMarkup(createElement(WeatherDecisionSummary))).toBe("");
    expect(renderToStaticMarkup(createElement(WeatherDecisionSummary, { context: { status: "not_saved", reason: "no_longer_available" } }))).toContain("Le plan a bien été validé");
  });
  it("labels daily forecasts explicitly without relabeling legacy captured service windows", () => {
    const render = (window: ServiceWeather["window"]) => renderToStaticMarkup(createElement(WeatherSummary, { weather: { ...weather, window } }));
    const daily = render({ opensAt: "00:00", closesAt: "24:00", timezone: "Europe/Paris", basis: "day" });
    expect(daily).toContain("Journée entière"); expect(daily).toContain("Brouillard");
    expect(daily).toContain("l’épisode le plus marqué");
    const legacy = render({ opensAt: "12:00", closesAt: "14:00", timezone: "Europe/Paris" });
    expect(legacy).toContain("Midi · 12:00–14:00"); expect(legacy).not.toContain("Journée entière");
  });
  it("ages displayed data without network or rewriting the immutable captured decision", () => {
    expect(weatherForDisplay(weather, Date.parse(weather.fetchedAt!) + 3600000).status).toBe("stale");
    expect(weatherForDisplay(weather, Date.parse(weather.fetchedAt!) + 21600000)).toMatchObject({ status: "unavailable", contextRef: null, summary: null });
    expect(weather.status).toBe("partial");
    expect(renderToStaticMarkup(createElement(WeatherDecisionSummary, { context: { status: "saved", weather } }))).toContain("Contexte conservé avec la décision");
  });
});
