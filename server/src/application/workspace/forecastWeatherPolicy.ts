import type { ForecastWeatherAdjustment } from "../../../../shared/forecastWeather.js";
import type { ServiceWeather } from "../../../../shared/serviceWeather.js";
import type { ForecastItem } from "../../../../shared/operationalForecast.js";
import { weatherCondition } from "../../../../shared/weatherConditions.js";

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
  let percent = 0, reason = "Pas d’ajustement retenu pour ces conditions.";
  const choose = (withoutTerrace: number, withTerrace: number) => hasTerrace ? withTerrace : withoutTerrace;
  if ([95, 96, 97, 99].includes(code) || wind >= 40) {
    percent = choose(-10, -30); reason = wind >= 40 ? "Vent maximal prévu d’au moins 40 km/h." : "Orage prévu.";
  } else if ([48, 56, 57, 65, 66, 67, 71, 73, 75, 77, 82, 85, 86].includes(code)) {
    percent = choose(-8, -25); reason = "Fortes précipitations, neige ou conditions givrantes prévues.";
  } else if ([61, 63, 80, 81].includes(code)) {
    percent = choose(-5, -15); reason = "Pluie ou averses prévues.";
  } else if ([45, 51, 53, 55].includes(code)) {
    percent = choose(-3, -10); reason = "Brouillard ou bruine prévus.";
  } else if ([0, 1, 2].includes(code) && temperatureMax >= 15 && temperatureMax <= 28 && wind < 25) {
    percent = choose(3, 10); reason = "Ciel dégagé ou éclaircies, maximum de 15 à 28 °C et vent inférieur à 25 km/h.";
  }
  return { ...base, status: percent ? "applied" : "neutral", percent, reason,
    weather: { date: weather.serviceDate, city: weather.position.place.name, weatherCode: code,
      temperatureMax, maxWindSpeed: wind, fetchedAt: weather.fetchedAt, contextRef: weather.contextRef } };
}
export function applyForecastWeather(items: ForecastItem[], adjustment: ForecastWeatherAdjustment): ForecastItem[] {
  if (adjustment.status !== "applied") return items;
  return items.map(item => ({ ...item, baselineQuantity: item.quantity,
    quantity: item.quantity === null ? null : Math.round(item.quantity * (1 + adjustment.percent / 100) * 1000) / 1000 }));
}
