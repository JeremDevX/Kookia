import { weatherCondition } from "../../shared/weatherConditions";
import { weatherScenarioEffect, type WeatherScenarioConditions } from "../../shared/weatherScenario";
import { draw } from "./calendar";
import type { Options } from "./model";

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
export function scenarioWeatherSummary(weather: ScenarioWeather) {
  if (!weather.conditions) return "Météo non renseignée · sans ajustement";
  const { weatherCode, temperatureMax, maxWindSpeed } = weather.conditions;
  return `${weatherCondition(weatherCode).label} · max. ${temperatureMax} °C · vent max. ${maxWindSpeed} km/h · ${weatherPercent(weather.percent)}`;
}
