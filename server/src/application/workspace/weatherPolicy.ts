import { createHash } from "node:crypto";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { ServiceWeather, WeatherForecast, WeatherHour, WeatherPosition } from "../../../../shared/serviceWeather.js";
import type { WeatherCache } from "./weatherStorage.js";

export const WEATHER_FRESH_MS = 3_600_000;
export const WEATHER_MAX_AGE_MS = 6 * WEATHER_FRESH_MS;
const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
export const weatherToday = (now: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(now);
export function weatherHours(date: string, opensAt: string, closesAt: string): string[] {
  // Include both occurrences of an autumn DST hour using UTC instants.
  if (opensAt >= closesAt) return [];
  const result: string[] = [];
  for (let time = Date.parse(date) - 3 * WEATHER_FRESH_MS; time < Date.parse(date) + 25 * WEATHER_FRESH_MS; time += WEATHER_FRESH_MS) {
    const instant = new Date(time), clock = hourFormat.format(instant);
    if (weatherToday(instant) === date && clock >= opensAt && clock < closesAt) result.push(instant.toISOString());
  }
  return result;
}
export const completeWeatherHour = (hour: WeatherHour) => hour.temperature !== null && hour.precipitation !== null &&
  hour.precipitationProbability !== null && hour.windSpeed !== null;
export function completeWeatherForecast(forecast: WeatherForecast) {
  return forecast.days?.length === 7 && forecast.days.every(day => day.weatherCode !== null) &&
    forecast.hours.length >= 167 && forecast.hours.every((hour, i) => completeWeatherHour(hour) &&
    (i === 0 || Date.parse(hour.time) - Date.parse(forecast.hours[i - 1].time) === WEATHER_FRESH_MS));
}
export function emptyServiceWeather(date: string, slot: ServiceSlot, reason: string,
  status: ServiceWeather["status"] = "unavailable", position: WeatherPosition | null = null): ServiceWeather {
  return { status, reason, serviceDate: date, slot, source: "Open-Meteo", provenance: null, position, window: null,
    hours: [], expectedHours: 0, completeHours: 0, summary: null, fetchedAt: null, issuedAt: null, expiresAt: null, contextRef: null,
    units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" } };
}
export function weatherUnavailableReason(date: string, now: Date): string | null {
  const today = weatherToday(now), last = new Date(Date.parse(today) + 6 * 86400000).toISOString().slice(0, 10);
  if (date < today) return "Consultez le contexte conservé avec le plan pour ce service passé.";
  if (date > last) return "La météo est proposée pour les sept prochains jours.";
  return null;
}
export function projectServiceWeather(date: string, slot: ServiceSlot, position: WeatherPosition,
  cache: WeatherCache | null, now: Date): ServiceWeather {
  const unavailable = weatherUnavailableReason(date, now);
  if (unavailable) return emptyServiceWeather(date, slot, unavailable, "unavailable", position);
  const forecast = cache?.positionRevision === position.revision ? cache.forecast : null;
  const age = forecast ? now.getTime() - Date.parse(forecast.fetchedAt) : Infinity;
  if (!forecast || !cache || age < 0 || age >= WEATHER_MAX_AGE_MS)
    return emptyServiceWeather(date, slot, "Météo indisponible. Vous pouvez continuer à préparer le service.", "unavailable", position);
  const expected = weatherHours(date, "00:00", "24:00");
  const hours = expected.map(time => forecast.hours.find(hour => hour.time === time) ??
    { time, temperature: null, precipitation: null, precipitationProbability: null, windSpeed: null });
  const completeHours = hours.filter(completeWeatherHour).length;
  const temperatures = hours.flatMap(hour => hour.temperature === null ? [] : [hour.temperature]);
  const probabilities = hours.flatMap(hour => hour.precipitationProbability === null ? [] : [hour.precipitationProbability]);
  const winds = hours.flatMap(hour => hour.windSpeed === null ? [] : [hour.windSpeed]);
  const stale = age >= WEATHER_FRESH_MS || cache.failed;
  const weatherCode = forecast.days?.find(day => day.date === date)?.weatherCode ?? null;
  const partial = completeHours !== expected.length || weatherCode === null;
  const status = stale ? "stale" : partial ? "partial" : "ready";
  return { ...emptyServiceWeather(date, slot, nullReason(stale, partial), status, position),
    provenance: cache.provenance, window: { opensAt: "00:00", closesAt: "24:00", timezone: "Europe/Paris", basis: "day" },
    hours, expectedHours: expected.length, completeHours,
    summary: { weatherCode, temperatureMin: temperatures.length ? Math.min(...temperatures) : null,
      temperatureMax: temperatures.length ? Math.max(...temperatures) : null,
      maxHourlyPrecipitationProbability: probabilities.length ? Math.max(...probabilities) : null,
      maxWindSpeed: winds.length ? Math.max(...winds) : null },
    fetchedAt: forecast.fetchedAt, issuedAt: forecast.issuedAt,
    expiresAt: new Date(Date.parse(forecast.fetchedAt) + WEATHER_MAX_AGE_MS).toISOString(),
    contextRef: createHash("sha256").update(JSON.stringify(["weather-day-v1", cache.id, position.revision, date, slot])).digest("hex"),
  };
}
const nullReason = (stale: boolean, partial: boolean) => stale
  ? "Dernière météo connue, non actualisée. Certaines valeurs peuvent manquer."
  : partial ? "Prévision incomplète : les valeurs absentes restent inconnues." : "";
