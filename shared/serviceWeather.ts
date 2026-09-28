import { z } from "zod";
import type { ServiceSlot } from "./serviceCalendar.js";

export const weatherPlaceSchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1).max(200),
  region: z.string().max(200), country: z.string().min(1).max(200),
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  timezone: z.string().min(1).max(100),
}).strict();
export type WeatherPlace = z.infer<typeof weatherPlaceSchema>;
export const weatherPositionSchema = z.object({
  place: weatherPlaceSchema, precision: z.literal("city"), confirmedAt: z.iso.datetime(),
  confirmedBy: z.string(), addressFingerprint: z.string(), invalidated: z.boolean(),
  provenance: z.enum(["live", "fixture"]),
}).strict();
export type WeatherPosition = z.infer<typeof weatherPositionSchema> & { revision: number };
export interface WeatherLocationState {
  configured: boolean; city: string; addressFingerprint: string; revision: number;
  status: "unconfirmed" | "confirmed" | "needs_review";
  position: WeatherPosition | null;
}
export const confirmWeatherPositionSchema = z.object({
  placeId: z.number().int().positive(), expectedRevision: z.number().int().nonnegative(),
  addressFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type ConfirmWeatherPosition = z.infer<typeof confirmWeatherPositionSchema>;
export const weatherHourSchema = z.object({
  time: z.iso.datetime(), temperature: z.number().finite().min(-100).max(70).nullable(),
  precipitation: z.number().finite().min(0).max(1000).nullable(),
  precipitationProbability: z.number().finite().min(0).max(100).nullable(),
  windSpeed: z.number().finite().min(0).max(500).nullable(),
}).strict();
export type WeatherHour = z.infer<typeof weatherHourSchema>;
export const weatherForecastSchema = z.object({
  fetchedAt: z.iso.datetime(), issuedAt: z.iso.datetime().nullable(),
  timezone: z.literal("Europe/Paris"), hours: z.array(weatherHourSchema).min(1).max(170),
}).strict();
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;
export type WeatherStatus = "not_configured" | "unavailable" | "stale" | "partial" | "ready";
export interface ServiceWeather {
  status: WeatherStatus; reason: string | null; serviceDate: string; slot: ServiceSlot;
  source: "Open-Meteo"; provenance: "live" | "fixture" | null;
  position: WeatherPosition | null;
  window: { opensAt: string; closesAt: string; timezone: "Europe/Paris" } | null;
  hours: WeatherHour[]; expectedHours: number; completeHours: number;
  summary: { temperatureMin: number | null; temperatureMax: number | null;
    maxHourlyPrecipitationProbability: number | null; maxWindSpeed: number | null } | null;
  units: { temperature: "°C"; precipitation: "mm"; precipitationProbability: "%"; windSpeed: "km/h" };
  fetchedAt: string | null; issuedAt: string | null; expiresAt: string | null;
  contextRef: string | null;
}
export type WeatherDecisionContext =
  | { status: "saved"; weather: ServiceWeather }
  | { status: "not_saved"; reason: "not_consulted" | "no_longer_available" };
