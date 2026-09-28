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
  summary: { weatherCode: 63, temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: 40, maxWindSpeed: 12 },
  units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" },
  fetchedAt: "2026-09-28T08:00:00Z", issuedAt: null, expiresAt: "2026-09-28T14:00:00Z", contextRef: "a".repeat(64) };
const context: SharedServiceWeather = { service: { date: weather.serviceDate, slot: weather.slot },
  state: { loading: false, weather, error: "", reload: () => {} }, settingsOpen: false,
  openSettings: () => {}, closeSettings: () => {} };

describe("weather in the top navigation", () => {
  it("uses the selected service only on Services, without changing page context elsewhere", () => {
    const params = new URLSearchParams("serviceDate=2026-10-02&serviceSlot=dinner");
    expect(weatherServiceContext("/services", params, "2026-09-28")).toEqual({ date: "2026-10-02", slot: "dinner" });
    expect(weatherServiceContext("/services", new URLSearchParams(), "2026-09-28")).toEqual({ date: "2026-09-28", slot: "lunch" });
    expect(weatherServiceContext("/orders", params, "2026-09-28")).toEqual({ date: "2026-09-28", slot: "lunch" });
  });
  it("makes the summary an accessible dialog button, not a navigation link", () => {
    const html = renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value: context }, createElement(WeatherNavButton)));
    expect(html).toContain('type="button"'); expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"'); expect(html).toContain("Ouvrir les réglages météo");
    expect(html).toContain("Pluie · 18–20 °C"); expect(html).toContain("lucide-cloud-rain"); expect(html).not.toContain("Soir"); expect(html).not.toContain("href=");
  });
  it("keeps absence, partial data, stale data and fixtures explicit in the compact summary", () => {
    expect(weatherButtonSummary({ ...context.state, loading: true })).toBe("Chargement…");
    expect(weatherButtonSummary({ ...context.state, error: "Connection failed" })).toBe("Indisponible");
    for (const [status, expected] of [["not_configured", "À configurer"], ["unavailable", "Indisponible"],
      ["stale", "Pluie · 18–20 °C · ancienne"], ["partial", "Pluie · 18–20 °C · partielle"]] as const) {
      expect(weatherButtonSummary({ ...context.state, weather: { ...weather, status } })).toBe(expected);
    }
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, status: "partial", summary: null } })).toBe("Ciel inconnu · Température inconnue · partielle");
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, provenance: "fixture" } })).toContain("test");
    expect(weatherButtonSummary({ ...context.state, weather: { ...weather, summary: { ...weather.summary!, temperatureMin: 0, temperatureMax: 0 } } })).toBe("Pluie · 0 °C");
  });
  it.each([[0, "Ciel dégagé", "sun"], [45, "Brouillard", "cloud-fog"], [73, "Neige", "cloud-snow"],
    [95, "Orage", "cloud-lightning"], [null, "Ciel inconnu", "circle-question-mark"], [undefined, "Ciel inconnu", "circle-question-mark"]] as const)("shows condition %s with visible text and an appropriate decorative icon", (weatherCode, label, icon) => {
    const value = { ...context, state: { ...context.state, weather: { ...weather, summary: { ...weather.summary!, weatherCode } } } };
    const html = renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value }, createElement(WeatherNavButton)));
    expect(html).toContain(`${label} · 18–20 °C`); expect(html).toContain(`lucide-${icon}`);
    expect(html).toContain('aria-hidden="true"');
  });
  it("only asks for a commune, keeping forecasts on demand and schedules outside the dialog", () => {
    const render = (value: SharedServiceWeather) => renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value }, createElement(WeatherSettingsContent)));
    const html = render(context);
    expect(html).toContain("Commune pour la météo");
    expect(html).not.toContain("horaires"); expect(html).toContain("Terminer");
    expect(html).not.toContain("/settings"); expect(html).not.toContain("Prévision d’aujourd’hui");
    expect(html).not.toContain("<select"); expect(html).not.toContain("service-weather-metrics");
    expect(html).toContain("Voir les prévisions de la journée"); expect(html).toContain('aria-expanded="false"');
  });
});
