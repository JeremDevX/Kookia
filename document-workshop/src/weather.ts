import { weatherCondition } from "../../shared/weatherConditions";
import { weatherScenarioEffect, type WeatherScenarioConditions } from "../../shared/weatherScenario";
import { formatParisDate, formatParisTime } from "../../shared/parisDate";
import type { WorkshopServiceWeather, WorkshopWeather } from "../../shared/workshopWeather";
import { draw, serviceTimes } from "./calendar";
import type { Options, ServiceName } from "./model";

export interface ScenarioWeather {
  source: "scenario";
  policyVersion: "terrace-weather-v1";
  hasTerrace: boolean | null;
  conditions: WeatherScenarioConditions | null;
  percent: number;
  reason: string;
}
export const scenarioWeatherNotice = "Météo de scénario, sans observation ni prévision Open-Meteo. Coefficients indicatifs, non calibrés.";
export const terraceLabel = (value: boolean | null) => value === null ? "Non renseignée" : value ? "Oui" : "Non";
export const weatherPercent = (percent: number) => `${percent > 0 ? "+" : ""}${percent} %`;

export function scenarioWeather(date: string, options: Options): ScenarioWeather {
  const base: ScenarioWeather = { source: "scenario", policyVersion: "terrace-weather-v1", hasTerrace: options.hasTerrace,
    conditions: null, percent: 0, reason: "Météo non renseignée : base semaine/saison conservée." };
  if (options.weather === "none") return base;
  const variants = ["clear", "rain", "fog", "storm"] as const;
  const condition = options.weather === "varied" ? variants[Math.floor(draw(options.seed, `${date}:weather`) * variants.length)] : options.weather;
  const month = Number(date.slice(5, 7));
  const seasonalMax = month >= 5 && month <= 8 ? 24 : month <= 2 || month >= 11 ? 9 : 18;
  const conditions: WeatherScenarioConditions = condition === "clear" ? { weatherCode: 1, temperatureMax: seasonalMax, maxWindSpeed: 12 }
    : condition === "rain" ? { weatherCode: 63, temperatureMax: seasonalMax - 3, maxWindSpeed: 18 }
    : condition === "fog" ? { weatherCode: 45, temperatureMax: seasonalMax - 5, maxWindSpeed: 8 }
    : { weatherCode: 95, temperatureMax: seasonalMax, maxWindSpeed: 45 };
  return { ...base, conditions, ...(options.hasTerrace === null
    ? { reason: "Terrasse non renseignée : base semaine/saison conservée." }
    : weatherScenarioEffect(options.hasTerrace, conditions)) };
}
export function liveServiceWeather(date: string, slot: ServiceName, input: WorkshopWeather): WorkshopServiceWeather {
  const { forecast, hasTerrace } = input;
  const unavailable: WorkshopServiceWeather = { slot, fetchedAt: null, terrace: hasTerrace === false ? "none" : "unknown",
    percent: 0, reason: "Prévision indisponible pour ce service. Fréquentation de référence conservée." };
  if (!forecast) return unavailable;
  const captured = new Date(forecast.fetchedAt), capturedOn = formatParisDate(captured);
  const { startHour, prepareAt } = serviceTimes[slot];
  if (capturedOn > date || (capturedOn === date && formatParisTime(captured) >= prepareAt)) return unavailable;
  const hours = forecast.hours.filter(hour => {
    const instant = new Date(hour.time);
    const clock = formatParisTime(instant), localHour = Number(clock.slice(0, 2));
    return formatParisDate(instant) === date && clock.endsWith(":00") && localHour >= startHour && localHour < startHour + 3;
  });
  if (hours.length !== 3 || new Set(hours.map(hour => hour.time)).size !== 3 || hours.some(hour =>
    hour.temperature === null || hour.windSpeed === null || hour.precipitation === null || hour.precipitationProbability === null)) return unavailable;
  const base = { ...unavailable, fetchedAt: forecast.fetchedAt };
  if (hasTerrace === null) return { ...base, reason: "Terrasse non renseignée. Fréquentation de référence conservée." };

  const wind = Math.max(...hours.map(hour => hour.windSpeed!));
  const strongRain = hours.some(hour => hour.precipitation! >= 2);
  const wet = hours.some(hour => hour.precipitation! >= .2 || hour.precipitationProbability! >= 70);
  const comfortable = hours.every(hour => hour.temperature! >= 15 && hour.temperature! <= 28);
  const terrace = hasTerrace ? wet || wind >= 25 || !comfortable ? "closed" : "open" : "none";
  if (wind >= 40) return { ...base, terrace, percent: hasTerrace ? -30 : -10, reason: "Vent fort prévu pendant le service." };
  if (strongRain) return { ...base, terrace, percent: hasTerrace ? -25 : -8, reason: "Fortes précipitations prévues pendant le service." };
  if (wet) return { ...base, terrace, percent: hasTerrace ? -15 : -5, reason: "Pluie probable pendant le service." };
  if (terrace === "closed") return { ...base, terrace, percent: -10, reason: "Température ou vent défavorables à la terrasse." };
  return { ...base, terrace, percent: terrace === "open" ? 10 : 0, reason: "Service prévu au sec." };
}

export function scenarioWeatherSummary(weather: ScenarioWeather) {
  if (!weather.conditions) return "Météo non renseignée · sans ajustement";
  const { weatherCode, temperatureMax, maxWindSpeed } = weather.conditions;
  return `${weatherCondition(weatherCode).label} · max. ${temperatureMax} °C · vent max. ${maxWindSpeed} km/h · ${weatherPercent(weather.percent)}`;
}
