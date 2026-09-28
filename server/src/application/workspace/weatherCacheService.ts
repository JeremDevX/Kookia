import { randomUUID } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WeatherProviderError, type WeatherProvider } from "../../integrations/weatherProvider.js";
import { weatherForecastSchema, type WeatherPosition } from "../../../../shared/serviceWeather.js";
import { getWeatherLocation } from "./weatherPositionService.js";
import { cacheKind, lockWeatherWorkspace, readWeatherCache, weatherJson, weatherKey, type WeatherCache } from "./weatherStorage.js";
import { completeWeatherForecast, WEATHER_FRESH_MS, WEATHER_MAX_AGE_MS } from "./weatherPolicy.js";

const pending = new WeakMap<WeatherProvider, Map<string, Promise<WeatherCache | null>>>();
export async function loadWeatherCache(restaurantId: string, position: WeatherPosition, provider: WeatherProvider): Promise<WeatherCache | null> {
  let requests = pending.get(provider);
  if (!requests) { requests = new Map(); pending.set(provider, requests); }
  const key = `${restaurantId}:${position.revision}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = refresh(restaurantId, position, provider);
  requests.set(key, request);
  try { return await request; } finally { requests.delete(key); }
}

async function refresh(restaurantId: string, position: WeatherPosition, provider: WeatherProvider) {
  const previous = await readWeatherCache(prisma, restaurantId);
  const cache = previous?.positionRevision === position.revision ? previous : null;
  const age = cache?.forecast ? Date.now() - Date.parse(cache.forecast.fetchedAt) : Infinity;
  if (cache && ((age >= 0 && age < WEATHER_FRESH_MS && cache.forecast?.days) || (cache.retryAt && Date.parse(cache.retryAt) > Date.now()))) return cache;
  let next: WeatherCache;
  try {
    const parsed = weatherForecastSchema.safeParse(await provider.forecast(position.place));
    if (!parsed.success) throw new WeatherProviderError("invalid_data");
    const forecast = parsed.data;
    const forecastAge = Date.now() - Date.parse(forecast.fetchedAt);
    if (forecastAge < 0 || forecastAge >= WEATHER_FRESH_MS) throw new WeatherProviderError("invalid_data");
    if (cache?.forecast && completeWeatherForecast(cache.forecast) && !completeWeatherForecast(forecast))
      throw new WeatherProviderError("invalid_data");
    next = { id: randomUUID(), positionRevision: position.revision, forecast, provenance: provider.provenance,
      lastSuccessAt: provider.provenance === "live" ? forecast.fetchedAt : null, retryAt: null, failed: false };
  } catch (error) {
    if (!(error instanceof WeatherProviderError)) throw error;
    next = { id: cache?.id ?? randomUUID(), positionRevision: position.revision,
      forecast: age >= 0 && age < WEATHER_MAX_AGE_MS ? cache?.forecast ?? null : null,
      provenance: cache?.provenance ?? provider.provenance, lastSuccessAt: cache?.lastSuccessAt ?? null,
      retryAt: error.retryAt ?? new Date(Date.now() + 60_000).toISOString(), failed: true };
  }
  return prisma.$transaction(async tx => {
    await lockWeatherWorkspace(tx, restaurantId);
    const current = await getWeatherLocation(restaurantId, provider.configured, tx);
    if (current.status !== "confirmed" || current.revision !== position.revision) return null;
    await tx.workspaceDocument.upsert({ where: weatherKey(restaurantId, cacheKind),
      create: { restaurantId, kind: cacheKind, data: weatherJson(next) },
      update: { data: weatherJson(next), revision: { increment: 1 } } });
    return next;
  });
}
