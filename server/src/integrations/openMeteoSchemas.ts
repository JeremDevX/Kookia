import { z } from "zod";
import type { WeatherForecast, WeatherPlace } from "../../../shared/serviceWeather.js";
import { WeatherProviderError } from "./weatherProvider.js";

const place = z.object({
  id: z.number().int().positive(), name: z.string().min(1).max(200),
  admin1: z.string().max(200).optional(), country: z.string().min(1).max(200),
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  timezone: z.string().min(1).max(100),
});
const searchResult = z.object({ results: z.array(place).max(10).optional() });
const hourly = z.object({
  time: z.array(z.number().int().nonnegative().max(253402300799)).min(1).max(170),
  temperature_2m: z.array(z.number().finite().min(-100).max(70).nullable()),
  precipitation: z.array(z.number().finite().min(0).max(1000).nullable()),
  precipitation_probability: z.array(z.number().finite().min(0).max(100).nullable()),
  wind_speed_10m: z.array(z.number().finite().min(0).max(500).nullable()),
}).refine(value => [value.temperature_2m, value.precipitation, value.precipitation_probability, value.wind_speed_10m]
  .every(values => values.length === value.time.length) && value.time.every((time, i) => i === 0 || time > value.time[i - 1]));
const forecastResult = z.object({
  timezone: z.literal("Europe/Paris"),
  hourly_units: z.object({ time: z.literal("unixtime"), temperature_2m: z.literal("°C"),
    precipitation: z.literal("mm"), precipitation_probability: z.literal("%"), wind_speed_10m: z.literal("km/h") }),
  hourly,
});
const mapPlace = (value: z.infer<typeof place>): WeatherPlace => ({
  id: value.id, name: value.name, region: value.admin1 ?? "", country: value.country,
  latitude: value.latitude, longitude: value.longitude, timezone: value.timezone,
});
export function parsePlaces(input: unknown): WeatherPlace[] {
  const parsed = searchResult.safeParse(input);
  if (!parsed.success) throw new WeatherProviderError("invalid_data");
  return (parsed.data.results ?? []).map(mapPlace);
}
export function parsePlace(input: unknown): WeatherPlace {
  const parsed = place.safeParse(input);
  if (!parsed.success) throw new WeatherProviderError("invalid_data");
  return mapPlace(parsed.data);
}
export function parseForecast(input: unknown, fetchedAt: string): WeatherForecast {
  const parsed = forecastResult.safeParse(input);
  if (!parsed.success) throw new WeatherProviderError("invalid_data");
  const values = parsed.data.hourly;
  return { fetchedAt, issuedAt: null, timezone: "Europe/Paris", hours: values.time.map((time, i) => ({
    time: new Date(time * 1000).toISOString(), temperature: values.temperature_2m[i],
    precipitation: values.precipitation[i], precipitationProbability: values.precipitation_probability[i], windSpeed: values.wind_speed_10m[i],
  })) };
}
