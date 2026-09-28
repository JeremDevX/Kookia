import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ServiceWeather } from "../../../shared/serviceWeather";
import { ServiceWeatherContext, type SharedServiceWeather } from "../../features/services/weather.context";
import { weatherButtonSummary } from "../../features/services/weatherPresentation";
import { weatherServiceContext } from "../../features/services/serviceNavigation";
import WeatherNavButton from "./WeatherNavButton";
import WeatherSettingsContent from "./WeatherSettingsContent";

const weather: ServiceWeather = { serviceDate: "2026-09-28", slot: "dinner", status: "ready", reason: null,
  source: "Open-Meteo", provenance: "live", position: null, window: null, hours: [], completeHours: 2, expectedHours: 2,
  summary: { temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: 40, maxWindSpeed: 12 },
  units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" },
  fetchedAt: "2026-09-28T08:00:00Z", issuedAt: null, expiresAt: "2026-09-28T14:00:00Z", contextRef: "a".repeat(64) };
const context: SharedServiceWeather = { service: { date: weather.serviceDate, slot: weather.slot }, followsService: true,
  state: { loading: false, weather, error: "", reload: () => {} }, settingsOpen: false,
  openSettings: () => {}, closeSettings: () => {}, selectSlot: () => {} };

describe("weather in the top navigation", () => {
  it("uses the selected service only on Services, without changing page context elsewhere", () => {
    const params = new URLSearchParams("serviceDate=2026-10-02&serviceSlot=dinner");
    expect(weatherServiceContext("/services", params, "2026-09-28", "lunch")).toEqual({ date: "2026-10-02", slot: "dinner" });
    expect(weatherServiceContext("/services", new URLSearchParams(), "2026-09-28", "dinner")).toEqual({ date: "2026-09-28", slot: "lunch" });
    expect(weatherServiceContext("/orders", params, "2026-09-28", "dinner")).toEqual({ date: "2026-09-28", slot: "dinner" });
  });
  it("makes the summary an accessible dialog button, not a navigation link", () => {
    const html = renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value: context }, createElement(WeatherNavButton)));
    expect(html).toContain('type="button"'); expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"'); expect(html).toContain("Ouvrir les réglages météo");
    expect(html).toContain("18–20 °C"); expect(html).toContain("Soir"); expect(html).not.toContain("href=");
  });
  it("keeps absence, partial data, stale data and fixtures explicit in the compact summary", () => {
    expect(weatherButtonSummary({ ...context.state, loading: true })).toBe("Chargement…");
    expect(weatherButtonSummary({ ...context.state, error: "Connection failed" })).toBe("Indisponible");
    for (const [status, expected] of [["not_configured", "À configurer"], ["unavailable", "Indisponible"],
      ["stale", "18–20 °C · ancienne"], ["partial", "18–20 °C · partielle"]] as const) {
      expect(weatherButtonSummary({ ...context.state, weather: { ...weather, status } })).toBe(expected);
    }
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, status: "partial", summary: null } })).toBe("Température inconnue · partielle");
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, provenance: "fixture" } })).toContain("test");
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, summary: { ...weather.summary!, temperatureMin: 0, temperatureMax: 0 } } })).toBe("0 °C");
  });
  it("keeps service selection read-only in the dialog and exposes the shared settings without leaving the sheet", () => {
    const render = (value: SharedServiceWeather) => renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value }, createElement(WeatherSettingsContent)));
    const html = render(context);
    expect(html).toContain("Votre fiche reste ouverte"); expect(html).toContain("Commune pour la météo");
    expect(html).toContain("Régler les horaires des services"); expect(html).toContain("Terminer");
    expect(html).not.toContain("/settings"); expect(html).not.toContain("Prévision d’aujourd’hui");
    const dashboard = render({ ...context, followsService: false });
    expect(dashboard).toContain("Prévision d’aujourd’hui"); expect(dashboard).toContain('value="dinner" selected=""');
  });
});
