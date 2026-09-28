import type { ServiceSlot } from "./serviceCalendar.js";

export interface ForecastWeatherAdjustment {
  policyVersion: "terrace-weather-v1";
  hasTerrace: boolean | null;
  status: "applied" | "neutral" | "not_applied";
  percent: number;
  reason: string;
  weather: { date: string; city: string; weatherCode: number; temperatureMax: number;
    maxWindSpeed: number; fetchedAt: string; contextRef: string } | null;
}
export const forecastWeatherNotice = "Ajustement météo indicatif, non calibré sur les ventes du restaurant. À revoir par le chef.";
export interface ForecastWeatherReference { date: string; slot: ServiceSlot; adjustment: ForecastWeatherAdjustment; }
export function forecastWeatherExplanation(adjustment: ForecastWeatherAdjustment) {
  const profile = adjustment.hasTerrace === null ? "terrasse non renseignée" : adjustment.hasTerrace ? "avec terrasse" : "sans terrasse";
  const percent = `${adjustment.percent > 0 ? "+" : ""}${adjustment.percent} %`;
  return `Météo : ${adjustment.status === "not_applied" ? "sans ajustement" : percent} (${profile}). ${adjustment.reason}`;
}
