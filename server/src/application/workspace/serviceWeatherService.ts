import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { WeatherDecisionContext } from "../../../../shared/serviceWeather.js";
import { WeatherProviderError, type WeatherProvider } from "../../integrations/weatherProvider.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { getWeatherLocation, matchRestaurantWeatherLocation, usableWeatherPosition } from "./weatherPositionService.js";
import { loadWeatherCache } from "./weatherCacheService.js";
import { completeWeatherForecast, emptyServiceWeather, projectServiceWeather, weatherUnavailableReason, WEATHER_FRESH_MS } from "./weatherPolicy.js";
import { readWeatherCache, type WeatherDatabase } from "./weatherStorage.js";

export async function getServiceWeather(restaurantId: string, date: string, slot: ServiceSlot, provider: WeatherProvider,
  { matchSavedCity = false } = {}) {
  if (!provider.configured) return emptyServiceWeather(date, slot, "La météo n’est pas encore configurée.", "not_configured");
  let location = await getWeatherLocation(restaurantId, provider.configured);
  const reason = weatherUnavailableReason(date, new Date());
  if (reason) return emptyServiceWeather(date, slot, reason, "unavailable", usableWeatherPosition(location));
  if (matchSavedCity) {
    try {
      location = await matchRestaurantWeatherLocation(restaurantId, location, provider);
    } catch (error) {
      if (!(error instanceof WeatherProviderError)) throw error;
      return emptyServiceWeather(date, slot, error.message);
    }
  }
  const position = matchSavedCity ? usableWeatherPosition(location) : location.status === "confirmed" ? location.position : null;
  if (!position) return emptyServiceWeather(date, slot,
    "Précisez la commune du restaurant pour afficher la météo.", "not_configured");
  const cache = await loadWeatherCache(restaurantId, position, provider);
  // A location change while awaiting the provider must not display the old place.
  const current = await getWeatherLocation(restaurantId, provider.configured);
  if (!usableWeatherPosition(current) || current.revision !== location.revision)
    return emptyServiceWeather(date, slot, "La localisation a changé. Rechargez la météo.", "not_configured");
  return projectServiceWeather(date, slot, position, cache, new Date());
}

export async function weatherContextForDecision(db: WeatherDatabase, restaurantId: string, date: string, slot: ServiceSlot,
  contextRef?: string): Promise<WeatherDecisionContext> {
  if (!contextRef) return { status: "not_saved", reason: "not_consulted" };
  const [location, cache] = await Promise.all([
    getWeatherLocation(restaurantId, true, db), readWeatherCache(db, restaurantId),
  ]);
  if (location.status === "confirmed" && location.position) {
    const weather = projectServiceWeather(date, slot, location.position, cache, new Date());
    if (weather.contextRef === contextRef) return { status: "saved", weather };
  }
  return { status: "not_saved", reason: "no_longer_available" };
}

export async function getWeatherSources(restaurantId: string, configured: boolean) {
  const [location, cache] = await Promise.all([getWeatherLocation(restaurantId, configured), readWeatherCache(prisma, restaurantId)]);
  const realPosition = location.position?.provenance === "live";
  const validPosition = Boolean(usableWeatherPosition(location));
  const resolvedAt = location.position && ("matchedAt" in location.position ? location.position.matchedAt : location.position.confirmedAt);
  const realCache = cache?.provenance === "live" && cache.lastSuccessAt !== null && cache.positionRevision === location.revision;
  const age = cache?.forecast ? Date.now() - Date.parse(cache.forecast.fetchedAt) : -1;
  const fresh = cache?.forecast && age >= 0 && age < WEATHER_FRESH_MS && completeWeatherForecast(cache.forecast);
  return [
    { kind: "geocoding", state: !configured || !realPosition ? "not_connected" : validPosition ? "ready" : "degraded",
      lastSuccessAt: realPosition ? resolvedAt : null },
    { kind: "weather", state: !configured || !realCache ? "not_connected" : validPosition && fresh && !cache.failed ? "ready" : "degraded",
      lastSuccessAt: realCache ? cache.lastSuccessAt : null },
  ];
}
