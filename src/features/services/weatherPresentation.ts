import type { ServiceWeather } from "../../../shared/serviceWeather";
import type { useServiceWeather } from "./useServiceWeather";

export function weatherButtonSummary(state: Pick<ReturnType<typeof useServiceWeather>, "loading" | "weather" | "error">) {
  if (state.loading) return "Chargement…";
  if (state.error) return "Indisponible";
  const weather = state.weather;
  if (!weather || weather.status === "not_configured") return "À configurer";
  if (weather.status === "unavailable") return "Indisponible";
  const temperature = temperatureRange(weather);
  const notice = [weather.status === "stale" ? "ancienne" : weather.status === "partial" ? "partielle" : "",
    weather.provenance === "fixture" ? "test" : ""].filter(Boolean).join(" · ");
  return `${temperature}${notice ? ` · ${notice}` : ""}`;
}
function temperatureRange(weather: ServiceWeather) {
  const min = weather.summary?.temperatureMin, max = weather.summary?.temperatureMax;
  if (min == null || max == null) return "Température inconnue";
  const number = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return min === max ? `${number(min)} °C` : `${number(min)}–${number(max)} °C`;
}
