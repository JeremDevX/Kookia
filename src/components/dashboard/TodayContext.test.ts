import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { ServiceWeather } from "../../../shared/serviceWeather";
import { ServiceWeatherContext, type SharedServiceWeather } from "../../features/services/weather.context";
import TodayContext from "./TodayContext";

const weather: ServiceWeather = { serviceDate: "2026-09-28", slot: "lunch", status: "ready", reason: null,
  source: "Open-Meteo", provenance: "live", position: null, window: null, hours: [], completeHours: 2, expectedHours: 2,
  summary: { weatherCode: 63, temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: 40, maxWindSpeed: 12 },
  units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" },
  fetchedAt: "2026-09-28T08:00:00Z", issuedAt: null, expiresAt: "2026-09-28T14:00:00Z", contextRef: null };
const context: SharedServiceWeather = { service: { date: weather.serviceDate, slot: weather.slot },
  state: { loading: false, weather, error: "", reload: () => {} }, settingsOpen: false,
  openSettings: () => {}, closeSettings: () => {} };
const render = (value: SharedServiceWeather) => renderToStaticMarkup(createElement(ServiceWeatherContext.Provider, { value }, createElement(TodayContext)));

it("affiche la source et distingue les informations indisponibles", () => {
  const html = render(context);
  expect(html).toContain("Pluie · 18–20 °C");
  expect(html).toContain("Prévision : Open-Meteo");
  expect(html.match(/Informations indisponibles/g)).toHaveLength(2);
  expect(html).toContain('aria-haspopup="dialog"');
});
it("conserve les limites de fraîcheur et de provenance", () => {
  const stale = { ...context, state: { ...context.state, weather: { ...weather, status: "stale" as const, provenance: "fixture" as const } } };
  expect(render(stale)).toContain("ancienne · test");
  const unavailable = { ...context, state: { ...context.state, weather: { ...weather, status: "unavailable" as const } } };
  expect(render(unavailable)).toContain("Indisponible");
  expect(render(unavailable)).not.toContain("Prévision : Open-Meteo");
  const notConfigured = { ...context, state: { ...context.state, weather: { ...weather, status: "not_configured" as const } } };
  expect(render(notConfigured)).toContain("Configurer la météo");
});
