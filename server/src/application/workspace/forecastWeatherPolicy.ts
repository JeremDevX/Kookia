import type { ForecastWeatherAdjustment } from "../../../../shared/forecastWeather.js";
import type { ServiceWeather } from "../../../../shared/serviceWeather.js";
import type { ForecastItem } from "../../../../shared/operationalForecast.js";
import { weatherCondition } from "../../../../shared/weatherConditions.js";
import { weatherScenarioEffect } from "../../../../shared/weatherScenario.js";

// Explicit MVP scenario coefficients, not learned demand effects or confidence.
export function forecastWeatherAdjustment(hasTerrace: boolean | null, weather: ServiceWeather | null): ForecastWeatherAdjustment {
  const base: ForecastWeatherAdjustment = { policyVersion: "terrace-weather-v1", hasTerrace,
    status: "not_applied", percent: 0, reason: "", weather: null };
  if (hasTerrace === null) return { ...base, reason: "Renseignez la présence d’une terrasse dans les réglages du restaurant." };
  if (!weather) return { ...base, reason: "Météo indisponible ou commune à confirmer : estimation historique conservée." };
  if (weather.status !== "ready") return { ...base, reason: "Météo absente, ancienne ou incomplète : estimation historique conservée." };
  if (weather.provenance !== "live" || weather.position?.provenance !== "live")
    return { ...base, reason: "La météo de test ne modifie pas les prévisions du restaurant." };
  const code = weather.summary?.weatherCode, temperatureMax = weather.summary?.temperatureMax, wind = weather.summary?.maxWindSpeed;
  if (code == null || weatherCondition(code).kind === "unknown" || temperatureMax == null || wind == null || !weather.fetchedAt || !weather.contextRef)
    return { ...base, reason: "Conditions météo incomplètes : estimation historique conservée." };
  const { percent, reason } = weatherScenarioEffect(hasTerrace, { weatherCode: code, temperatureMax, maxWindSpeed: wind });
  return { ...base, status: percent ? "applied" : "neutral", percent, reason,
    weather: { date: weather.serviceDate, city: weather.position.place.name, weatherCode: code,
      temperatureMax, maxWindSpeed: wind, fetchedAt: weather.fetchedAt, contextRef: weather.contextRef } };
}
export function applyForecastWeather(items: ForecastItem[], adjustment: ForecastWeatherAdjustment): ForecastItem[] {
  if (adjustment.status !== "applied") return items;
  return items.map(item => ({ ...item, baselineQuantity: item.quantity,
    quantity: item.quantity === null ? null : Math.round(item.quantity * (1 + adjustment.percent / 100) * 1000) / 1000 }));
}
