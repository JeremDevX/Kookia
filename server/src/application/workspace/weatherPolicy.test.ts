import { describe, expect, it } from "vitest";
import { projectServiceWeather, weatherHours, weatherUnavailableReason } from "./weatherPolicy.js";
import type { WeatherPosition } from "../../../../shared/serviceWeather.js";
import type { WeatherCache } from "./weatherStorage.js";

const now = new Date("2026-09-28T08:00:00Z");
const position: WeatherPosition = { revision: 1, precision: "city", confirmedBy: "fixture", confirmedAt: now.toISOString(),
  invalidated: false, addressFingerprint: "fixture", provenance: "fixture", place: { id: 1, name: "Paris", region: "Île-de-France",
    country: "France", latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" } };
const cache: WeatherCache = { id: "afca853b-3a6c-4358-a442-a421568a3c53", positionRevision: 1,
  provenance: "fixture", lastSuccessAt: null, retryAt: null, failed: false,
  forecast: { days: [{ date: "2026-09-28", weatherCode: 45 }, { date: "2026-09-29", weatherCode: 63 }], fetchedAt: now.toISOString(), issuedAt: null, timezone: "Europe/Paris", hours: weatherHours("2026-09-28", "00:00", "24:00").map((time, i) => ({
    time, temperature: i === 23 ? 20 : 18, precipitation: 0, precipitationProbability: i === 23 ? 60 : 20, windSpeed: i === 23 ? 15 : 10,
  })) } };
describe("service weather policy", () => {
  it("covers full Paris days including distinct autumn DST instants and missing spring hours", () => {
    expect(weatherHours("2026-09-28", "00:00", "24:00")).toHaveLength(24);
    expect(weatherHours("2026-10-25", "00:00", "24:00")).toHaveLength(25);
    expect(weatherHours("2026-03-29", "00:00", "24:00")).toHaveLength(23);
    expect(weatherHours("2026-09-28", "12:00", "14:00")).toEqual(["2026-09-28T10:00:00.000Z", "2026-09-28T11:00:00.000Z"]);
    expect(weatherHours("2026-10-25", "02:00", "03:00")).toEqual(["2026-10-25T00:00:00.000Z", "2026-10-25T01:00:00.000Z"]);
    expect(weatherHours("2026-03-29", "02:00", "03:00")).toEqual([]);
    expect(weatherHours("2026-09-28", "23:00", "01:00")).toEqual([]);
    expect(weatherHours("2026-09-28", "00:00", "01:00")).toEqual(["2026-09-27T22:00:00.000Z"]);
  });
  it("summarizes the entire day including evening extremes, keeping decision refs service-specific", () => {
    const result = projectServiceWeather("2026-09-28", "lunch", position, cache, now);
    expect(result).toMatchObject({ status: "ready", completeHours: 24, expectedHours: 24, issuedAt: null,
      window: { basis: "day", opensAt: "00:00", closesAt: "24:00" },
      summary: { weatherCode: 45, temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: 60, maxWindSpeed: 15 } });
    expect(result.contextRef).toMatch(/^[a-f0-9]{64}$/);
    const dinner = projectServiceWeather("2026-09-28", "dinner", position, cache, now);
    expect(dinner.summary).toEqual(result.summary);
    expect(dinner.contextRef).not.toBe(result.contextRef);
    expect(projectServiceWeather("2026-09-28", "lunch", { ...position, revision: 2 }, { ...cache, positionRevision: 2 }, now).contextRef).not.toBe(result.contextRef);
  });
  it("never substitutes zeros for missing hours or values", () => {
    const partial = { ...cache, forecast: { ...cache.forecast!, hours: [cache.forecast!.hours[0]] } };
    const result = projectServiceWeather("2026-09-28", "lunch", position, partial, now);
    expect(result).toMatchObject({ status: "partial", completeHours: 1, expectedHours: 24 });
    expect(result.hours[1].precipitation).toBeNull();
    expect(projectServiceWeather("2026-09-29", "lunch", position, cache, now))
      .toMatchObject({ status: "partial", completeHours: 0, summary: { temperatureMin: null } });
  });
  it("selects the requested day's condition and marks missing or legacy conditions partial", () => {
    expect(projectServiceWeather("2026-09-29", "lunch", position, cache, now).summary?.weatherCode).toBe(63);
    for (const days of [undefined, [{ date: "2026-09-28", weatherCode: null }], [{ date: "2026-09-29", weatherCode: 63 }]]) {
      const result = projectServiceWeather("2026-09-28", "lunch", position, { ...cache, forecast: { ...cache.forecast!, days } }, now);
      expect(result).toMatchObject({ status: "partial", completeHours: 24, summary: { weatherCode: null, temperatureMin: 18 } });
    }
    const clear = projectServiceWeather("2026-09-28", "lunch", position,
      { ...cache, forecast: { ...cache.forecast!, days: [{ date: "2026-09-28", weatherCode: 0 }] } }, now);
    expect(clear).toMatchObject({ status: "ready", summary: { weatherCode: 0 } });
  });
  it("makes stale, expired, wrong-position and future-captured data explicit", () => {
    const read = (time: string, stored = cache) => projectServiceWeather("2026-09-28", "lunch", position, stored, new Date(time));
    expect(read("2026-09-28T09:00:00Z").status).toBe("stale");
    expect(read("2026-09-28T14:00:00Z")).toMatchObject({ status: "unavailable", contextRef: null, hours: [] });
    expect(read("2026-09-28T07:59:00Z").status).toBe("unavailable");
    expect(read(now.toISOString(), { ...cache, positionRevision: 2 }).status).toBe("unavailable");
  });
  it("does not invent past forecasts or future coverage", () => {
    expect(weatherUnavailableReason("2026-09-27", now)).toContain("passé");
    expect(weatherUnavailableReason("2026-10-05", now)).toContain("sept");
    expect(weatherUnavailableReason("2026-09-28", now)).toBeNull();
  });
});
