import { useEffect, useState } from "react";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { ServiceWeather } from "../../../shared/serviceWeather";
import { getServiceWeather } from "../../services/weatherService";

export function weatherForDisplay(weather: ServiceWeather, now: number): ServiceWeather {
  if (!weather.fetchedAt) return weather;
  const age = now - Date.parse(weather.fetchedAt);
  if (age >= 6 * 3600000) return { ...weather, status: "unavailable", reason: "La météo est trop ancienne. Rechargez-la si nécessaire.",
    hours: [], summary: null, contextRef: null };
  return age >= 3600000 && weather.status !== "stale"
    ? { ...weather, status: "stale", reason: "Dernière météo connue, non actualisée." } : weather;
}
export function useServiceWeather(date: string, slot: ServiceSlot) {
  const [reload, setReload] = useState(0);
  const [clock, setClock] = useState(Date.now);
  const key = `${date}:${slot}:${reload}`;
  const [response, setResponse] = useState<{ key: string; weather: ServiceWeather | null; error: string } | null>(null);
  const loading = response?.key !== key;
  const weather = !loading ? response?.weather ?? null : null;
  useEffect(() => {
    let active = true;
    getServiceWeather(date, slot).then(result => {
      if (active) { setClock(Date.now()); setResponse({ key, weather: result, error: "" }); }
    }, (error: unknown) => {
      if (active) setResponse({ key, weather: null, error: error instanceof Error ? error.message : "Météo indisponible." });
    });
    return () => { active = false; };
  }, [date, slot, key]);
  useEffect(() => {
    if (!weather?.fetchedAt) return;
    const captured = Date.parse(weather.fetchedAt);
    const next = [captured + 3600000, captured + 6 * 3600000].find(time => time > clock);
    if (!next) return;
    const timer = window.setTimeout(() => setClock(Date.now()), Math.max(1, next - Date.now()));
    return () => window.clearTimeout(timer);
  }, [weather, clock]);
  return { loading, weather: weather ? weatherForDisplay(weather, clock) : null,
    error: loading ? "" : response?.error ?? "", reload: () => setReload(value => value + 1) };
}
