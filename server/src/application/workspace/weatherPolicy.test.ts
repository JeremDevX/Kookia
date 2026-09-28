import { describe, expect, it } from "vitest";
import { projectServiceWeather, weatherHours, weatherUnavailableReason, type WeatherSchedule } from "./weatherPolicy.js";
import type { WeatherPosition } from "../../../../shared/serviceWeather.js";
import type { WeatherCache } from "./weatherStorage.js";

const now = new Date("2026-09-28T08:00:00Z");
const position: WeatherPosition = { revision: 1, precision: "city", confirmedBy: "fixture", confirmedAt: now.toISOString(),
  invalidated: false, addressFingerprint: "fixture", provenance: "fixture", place: { id: 1, name: "Paris", region: "Île-de-France",
    country: "France", latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" } };
const schedule: WeatherSchedule = { plannedOpen: true, opensAt: "12:00", closesAt: "14:00", key: "fixture" };
const cache: WeatherCache = { id: "afca853b-3a6c-4358-a442-a421568a3c53", positionRevision: 1,
  provenance: "fixture", lastSuccessAt: null, retryAt: null, failed: false,
  forecast: { fetchedAt: now.toISOString(), issuedAt: null, timezone: "Europe/Paris", hours: [
    { time: "2026-09-28T10:00:00.000Z", temperature: 18, precipitation: 0, precipitationProbability: 20, windSpeed: 10 },
    { time: "2026-09-28T11:00:00.000Z", temperature: 20, precipitation: 1, precipitationProbability: 60, windSpeed: 15 },
  ] } };
describe("service weather policy", () => {
  it("selects Paris service hours including distinct autumn DST instants and missing spring hours", () => {
    expect(weatherHours("2026-09-28", "12:00", "14:00")).toEqual(["2026-09-28T10:00:00.000Z", "2026-09-28T11:00:00.000Z"]);
    expect(weatherHours("2026-10-25", "02:00", "03:00")).toEqual(["2026-10-25T00:00:00.000Z", "2026-10-25T01:00:00.000Z"]);
    expect(weatherHours("2026-03-29", "02:00", "03:00")).toEqual([]);
    expect(weatherHours("2026-09-28", "23:00", "01:00")).toEqual([]);
    expect(weatherHours("2026-09-28", "00:00", "01:00")).toEqual(["2026-09-27T22:00:00.000Z"]);
  });
  it("returns a traceable summary with the maximum hourly probability, not a service probability", () => {
    const result = projectServiceWeather("2026-09-28", "lunch", position, schedule, cache, now);
    expect(result).toMatchObject({ status: "ready", completeHours: 2, expectedHours: 2, issuedAt: null,
      summary: { temperatureMin: 18, temperatureMax: 20, maxHourlyPrecipitationProbability: 60, maxWindSpeed: 15 } });
    expect(result.contextRef).toMatch(/^[a-f0-9]{64}$/);
    expect(projectServiceWeather("2026-09-28", "lunch", position, { ...schedule, key: "changed" }, cache, now).contextRef).not.toBe(result.contextRef);
  });
  it("never substitutes zeros for missing hours or values", () => {
    const partial = { ...cache, forecast: { ...cache.forecast!, hours: [cache.forecast!.hours[0]] } };
    const result = projectServiceWeather("2026-09-28", "lunch", position, schedule, partial, now);
    expect(result).toMatchObject({ status: "partial", completeHours: 1, expectedHours: 2 });
    expect(result.hours[1].precipitation).toBeNull();
    expect(projectServiceWeather("2026-09-28", "dinner", position, { ...schedule, opensAt: "19:00", closesAt: "21:00" }, cache, now))
      .toMatchObject({ status: "partial", completeHours: 0, summary: { temperatureMin: null } });
  });
  it("makes stale, expired, wrong-position and future-captured data explicit", () => {
    const read = (time: string, stored = cache) => projectServiceWeather("2026-09-28", "lunch", position, schedule, stored, new Date(time));
    expect(read("2026-09-28T09:00:00Z").status).toBe("stale");
    expect(read("2026-09-28T14:00:00Z")).toMatchObject({ status: "unavailable", contextRef: null, hours: [] });
    expect(read("2026-09-28T07:59:00Z").status).toBe("unavailable");
    expect(read(now.toISOString(), { ...cache, positionRevision: 2 }).status).toBe("unavailable");
  });
  it("does not invent past forecasts, future coverage or opening hours", () => {
    expect(weatherUnavailableReason("2026-09-27", schedule, now)).toContain("passé");
    expect(weatherUnavailableReason("2026-10-05", schedule, now)).toContain("sept");
    expect(weatherUnavailableReason("2026-09-28", { ...schedule, plannedOpen: false }, now)).toContain("ouvert");
    expect(weatherUnavailableReason("2026-09-28", { ...schedule, opensAt: null }, now)).toContain("horaires");
  });
});
