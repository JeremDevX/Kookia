import { describe, expect, it } from "vitest";
import type { ServiceWeather } from "../../../../shared/serviceWeather.js";
import type { ForecastItem } from "../../../../shared/operationalForecast.js";
import { applyForecastWeather, forecastWeatherAdjustment } from "./forecastWeatherPolicy.js";

const weather: ServiceWeather = {
  status: "ready", reason: null, serviceDate: "2026-09-28", slot: "lunch", source: "Open-Meteo", provenance: "live",
  position: { revision: 1, precision: "city", confirmedBy: "test", confirmedAt: "2026-09-28T08:00:00Z",
    addressFingerprint: "test", invalidated: false, provenance: "live", place: { id: 1, name: "Paris", region: "Île-de-France",
      country: "France", latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" } },
  window: { opensAt: "00:00", closesAt: "24:00", timezone: "Europe/Paris", basis: "day" },
  hours: [], expectedHours: 24, completeHours: 24,
  summary: { weatherCode: 63, temperatureMin: 12, temperatureMax: 20, maxHourlyPrecipitationProbability: 80, maxWindSpeed: 10 },
  units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" },
  fetchedAt: "2026-09-28T08:00:00Z", issuedAt: null, expiresAt: "2026-09-28T09:00:00Z", contextRef: "a".repeat(64),
};
const conditions = (weatherCode: number, temperatureMax = 20, maxWindSpeed = 10): ServiceWeather =>
  ({ ...weather, summary: { ...weather.summary!, weatherCode, temperatureMax, maxWindSpeed } });
const item = (quantity: number | null): ForecastItem => ({ entryId: "entry", saleItemId: "sale", name: "Plat", category: "Plat",
  quantity, observations: 4, model: "weekday", observedMin: 5, observedMax: 15, deviation: 2 });

describe("explicit terrace weather scenarios", () => {
  it.each([
    [95, -10, -30], [99, -10, -30], [65, -8, -25], [73, -8, -25], [48, -8, -25],
    [63, -5, -15], [80, -5, -15], [45, -3, -10], [53, -3, -10], [0, 3, 10], [2, 3, 10], [3, 0, 0],
  ])("weights code %i more strongly with a terrace, without stacking", (code, without, withTerrace) => {
    expect(forecastWeatherAdjustment(false, conditions(code)).percent).toBe(without);
    expect(forecastWeatherAdjustment(true, conditions(code))).toMatchObject({ percent: withTerrace,
      status: withTerrace ? "applied" : "neutral", policyVersion: "terrace-weather-v1", hasTerrace: true,
      weather: { weatherCode: code, city: "Paris", contextRef: weather.contextRef, fetchedAt: weather.fetchedAt } });
  });
  it("uses explicit temperature and wind boundaries, with severe conditions taking priority", () => {
    for (const temp of [15, 28]) expect(forecastWeatherAdjustment(true, conditions(0, temp, 24.9)).percent).toBe(10);
    for (const temp of [14.9, 28.1]) expect(forecastWeatherAdjustment(true, conditions(0, temp)).percent).toBe(0);
    expect(forecastWeatherAdjustment(true, conditions(0, 20, 25)).percent).toBe(0);
    expect(forecastWeatherAdjustment(true, conditions(0, 20, 40)).percent).toBe(-30);
    expect(forecastWeatherAdjustment(false, conditions(63, 20, 40)).percent).toBe(-10);
  });
  it("does not apply unknown, unavailable, stale, incomplete or fixture data", () => {
    expect(forecastWeatherAdjustment(null, weather).status).toBe("not_applied");
    const unusable: (ServiceWeather | null)[] = [null,
      ...(["not_configured", "unavailable", "stale", "partial"] as const).map(status => ({ ...weather, status })),
      { ...weather, provenance: "fixture" }, { ...weather, position: { ...weather.position!, provenance: "fixture" } },
      { ...weather, position: null }, { ...weather, summary: null }, conditions(10),
      { ...weather, summary: { ...weather.summary!, temperatureMax: null } },
      { ...weather, summary: { ...weather.summary!, maxWindSpeed: null } }, { ...weather, fetchedAt: null }, { ...weather, contextRef: null },
    ];
    for (const value of unusable) expect(forecastWeatherAdjustment(true, value)).toMatchObject({ status: "not_applied", percent: 0, weather: null });
  });
  it("preserves the historical base and dispersion, never invents missing forecasts or mutates inputs", () => {
    const items = [item(10), item(0), item(null), item(1.111)];
    const adjusted = applyForecastWeather(items, forecastWeatherAdjustment(true, weather));
    expect(adjusted.map(entry => entry.quantity)).toEqual([8.5, 0, null, 0.944]);
    expect(adjusted.map(entry => entry.baselineQuantity)).toEqual([10, 0, null, 1.111]);
    expect(adjusted[0]).toMatchObject({ observedMin: 5, observedMax: 15, deviation: 2 });
    expect(items[0]).toEqual(item(10));
    expect(applyForecastWeather(items, forecastWeatherAdjustment(null, weather))).toBe(items);
    expect(applyForecastWeather(items, forecastWeatherAdjustment(true, conditions(3)))).toBe(items);
  });
});
