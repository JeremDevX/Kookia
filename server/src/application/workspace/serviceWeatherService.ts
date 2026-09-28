import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { WeatherDecisionContext } from "../../../../shared/serviceWeather.js";
import type { WeatherProvider } from "../../integrations/weatherProvider.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { getWeatherLocation } from "./weatherPositionService.js";
import { loadWeatherCache } from "./weatherCacheService.js";
import { completeWeatherForecast, emptyServiceWeather, projectServiceWeather, weatherUnavailableReason, WEATHER_FRESH_MS } from "./weatherPolicy.js";
import { getWeatherSchedule } from "./weatherSchedule.js";
import { readWeatherCache, type WeatherDatabase } from "./weatherStorage.js";

export async function getServiceWeather(restaurantId: string, date: string, slot: ServiceSlot, provider: WeatherProvider) {
  const location = await getWeatherLocation(restaurantId, provider.configured);
  if (!provider.configured) return emptyServiceWeather(date, slot, "La météo n’est pas encore configurée.", "not_configured");
  if (location.status !== "confirmed" || !location.position) return emptyServiceWeather(date, slot,
    location.status === "needs_review" ? "La localisation a changé. Confirmez à nouveau la commune." :
      "Confirmez la commune du restaurant pour afficher la météo.", "not_configured");
  const schedule = await getWeatherSchedule(prisma, restaurantId, date, slot);
  const reason = weatherUnavailableReason(date, schedule, new Date());
  if (reason) return emptyServiceWeather(date, slot, reason, "unavailable", location.position);
  const cache = await loadWeatherCache(restaurantId, location.position, provider);
  // A location change while awaiting the provider must not display the old place.
  const current = await getWeatherLocation(restaurantId, provider.configured);
  if (current.status !== "confirmed" || current.revision !== location.revision)
    return emptyServiceWeather(date, slot, "La localisation a changé. Rechargez la météo.", "not_configured");
  const currentSchedule = await getWeatherSchedule(prisma, restaurantId, date, slot);
  return projectServiceWeather(date, slot, location.position, currentSchedule, cache, new Date());
}

export async function weatherContextForDecision(db: WeatherDatabase, restaurantId: string, date: string, slot: ServiceSlot,
  contextRef?: string): Promise<WeatherDecisionContext> {
  if (!contextRef) return { status: "not_saved", reason: "not_consulted" };
  const [location, schedule, cache] = await Promise.all([
    getWeatherLocation(restaurantId, true, db), getWeatherSchedule(db, restaurantId, date, slot), readWeatherCache(db, restaurantId),
  ]);
  if (location.status === "confirmed" && location.position) {
    const weather = projectServiceWeather(date, slot, location.position, schedule, cache, new Date());
    if (weather.contextRef === contextRef) return { status: "saved", weather };
  }
  return { status: "not_saved", reason: "no_longer_available" };
}

export async function getWeatherSources(restaurantId: string, configured: boolean) {
  const [location, cache] = await Promise.all([getWeatherLocation(restaurantId, configured), readWeatherCache(prisma, restaurantId)]);
  const realPosition = location.position?.provenance === "live";
  const validPosition = location.status === "confirmed";
  const realCache = cache?.provenance === "live" && cache.lastSuccessAt !== null && cache.positionRevision === location.revision;
  const age = cache?.forecast ? Date.now() - Date.parse(cache.forecast.fetchedAt) : -1;
  const fresh = cache?.forecast && age >= 0 && age < WEATHER_FRESH_MS && completeWeatherForecast(cache.forecast);
  return [
    { kind: "geocoding", state: !configured || !realPosition ? "not_connected" : validPosition ? "ready" : "degraded",
      lastSuccessAt: realPosition ? location.position!.confirmedAt : null },
    { kind: "weather", state: !configured || !realCache ? "not_connected" : validPosition && fresh && !cache.failed ? "ready" : "degraded",
      lastSuccessAt: realCache ? cache.lastSuccessAt : null },
  ];
}
