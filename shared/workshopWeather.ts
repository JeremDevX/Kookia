import { z } from "zod";
import { weatherForecastSchema } from "./serviceWeather.js";

export const workshopWeatherSchema = z.strictObject({
  hasTerrace: z.boolean().nullable(),
  forecast: weatherForecastSchema.nullable(),
});

export type WorkshopWeather = z.infer<typeof workshopWeatherSchema>;

export const workshopServiceWeatherSchema = z.strictObject({
  slot: z.enum(["lunch", "dinner"]),
  terrace: z.enum(["open", "closed", "none", "unknown"]),
  percent: z.number().int().min(-30).max(10),
  reason: z.string().min(1).max(160),
  fetchedAt: z.iso.datetime().nullable(),
}).refine(weather => weather.fetchedAt !== null || weather.percent === 0 && weather.terrace !== "open" && weather.terrace !== "closed");

export type WorkshopServiceWeather = z.infer<typeof workshopServiceWeatherSchema>;
