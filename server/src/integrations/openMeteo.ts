import { parseForecast, parsePlace, parsePlaces } from "./openMeteoSchemas.js";
import { WeatherProviderError, type WeatherProvider } from "./weatherProvider.js";
import type { WeatherPlace } from "../../../shared/serviceWeather.js";

export interface OpenMeteoOptions { mode: "disabled" | "evaluation" | "commercial"; apiKey?: string; }
export function createOpenMeteo(options: OpenMeteoOptions, transport: typeof fetch = fetch): WeatherProvider {
  const cooldown = new Map<string, number>();
  const configured = options.mode !== "disabled" && (options.mode !== "commercial" || Boolean(options.apiKey));
  async function request(kind: "geocoding" | "forecast", path: string, parameters: Record<string, string>): Promise<unknown> {
    if (!configured) throw new WeatherProviderError("not_configured");
    const prefix = options.mode === "commercial" ? "customer-" : "";
    const host = kind === "forecast" ? `${prefix}api.open-meteo.com` : `${prefix}geocoding-api.open-meteo.com`;
    const url = new URL(`https://${host}/v1/${path}`);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    if (options.mode === "commercial") url.searchParams.set("apikey", options.apiKey!);
    const retryAt = cooldown.get(kind) ?? 0;
    if (retryAt > Date.now()) throw new WeatherProviderError("rate_limited", new Date(retryAt).toISOString());
    try {
      const response = await transport(url, { signal: AbortSignal.timeout(5000), redirect: "error", headers: { Accept: "application/json" } });
      if (response.status === 429) {
        const retry = response.headers.get("retry-after");
        const until = retry && /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry ?? "");
        const next = Number.isFinite(until) && until > Date.now() ? until : Date.now() + 60_000;
        cooldown.set(kind, next);
        throw new WeatherProviderError("rate_limited", new Date(next).toISOString());
      }
      if (!response.ok) throw new WeatherProviderError("unavailable");
      if (Number(response.headers.get("content-length")) > 512_000) throw new WeatherProviderError("invalid_data");
      const body = await response.text();
      if (body.length > 512_000) throw new WeatherProviderError("invalid_data");
      return JSON.parse(body) as unknown;
    } catch (error) {
      if (error instanceof WeatherProviderError) throw error;
      // Provider URLs can contain the commercial key: never propagate transport errors.
      throw new WeatherProviderError("unavailable");
    }
  }
  return { configured, provenance: "live",
    async search(query) { return parsePlaces(await request("geocoding", "search", { name: query, count: "10", language: "fr", format: "json" })); },
    async resolve(id) {
      const result = parsePlace(await request("geocoding", "get", { id: String(id), language: "fr" }));
      if (result.id !== id) throw new WeatherProviderError("invalid_data");
      return result;
    },
    async forecast(place: WeatherPlace) {
      const raw = await request("forecast", "forecast", { latitude: String(place.latitude), longitude: String(place.longitude),
        hourly: "temperature_2m,precipitation,precipitation_probability,wind_speed_10m", daily: "weather_code", forecast_days: "7",
        timezone: "Europe/Paris", timeformat: "unixtime", temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm" });
      return parseForecast(raw, new Date().toISOString());
    },
  };
}
