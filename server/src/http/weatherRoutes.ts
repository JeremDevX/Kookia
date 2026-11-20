import { Router, type Response } from "express";
import { z } from "zod";
import { confirmWeatherPositionSchema } from "../../../shared/serviceWeather.js";
import { slotSchema } from "../../../shared/serviceOperations.js";
import { env } from "../config/env.js";
import { createOpenMeteo } from "../integrations/openMeteo.js";
import { WeatherProviderError, type WeatherProvider } from "../integrations/weatherProvider.js";
import { getWeatherLocation, confirmWeatherLocation } from "../application/workspace/weatherPositionService.js";
import { getServiceWeather } from "../application/workspace/serviceWeatherService.js";
import { rateLimit } from "./rateLimit.js";
import { workspaceContext as context } from "./workspaceContext.js";

export const weatherRoutes = Router();
const evaluationProvider = createOpenMeteo({ mode: "evaluation" });
export const weatherProviderForRestaurant = (restaurantId: string, provider: WeatherProvider): WeatherProvider =>
  !provider.configured && restaurantId === env.OPEN_METEO_EVALUATION_RESTAURANT_ID ? evaluationProvider : provider;

export const weatherProviderFor = (res: Response): WeatherProvider =>
  weatherProviderForRestaurant(context(res).restaurantId, res.locals.weatherProvider as WeatherProvider);
const query = z.object({ date: z.iso.date(), slot: slotSchema }).strict();
weatherRoutes.get("/weather/location", async (_req, res) => {
  res.json(await getWeatherLocation(context(res).restaurantId, weatherProviderFor(res).configured));
});
weatherRoutes.get("/weather/places", rateLimit(30, 60_000), async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(2).max(120) }).strict().parse(req.query);
  res.json({ places: await weatherProviderFor(res).search(q) });
});
weatherRoutes.post("/weather/location", rateLimit(20, 60_000), async (req, res) => {
  const { restaurantId, actorId } = context(res);
  res.json(await confirmWeatherLocation(restaurantId, actorId, confirmWeatherPositionSchema.parse(req.body), weatherProviderFor(res)));
});
weatherRoutes.get("/services/weather", async (req, res) => {
  const { date, slot } = query.parse(req.query);
  res.json(await getServiceWeather(context(res).restaurantId, date, slot, weatherProviderFor(res), { matchSavedCity: true }));
});
weatherRoutes.use((error: unknown, _req: import("express").Request, res: Response, next: import("express").NextFunction) => {
  if (!(error instanceof WeatherProviderError)) { next(error); return; }
  if (error.retryAt) res.setHeader("Retry-After", String(Math.max(1, Math.ceil((Date.parse(error.retryAt) - Date.now()) / 1000))));
  res.status(503).json({ error: { code: "WEATHER_UNAVAILABLE", message: error.message } });
});
