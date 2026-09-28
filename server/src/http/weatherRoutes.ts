import { Router, type Response } from "express";
import { z } from "zod";
import { confirmWeatherPositionSchema } from "../../../shared/serviceWeather.js";
import { slotSchema } from "../../../shared/serviceOperations.js";
import { WeatherProviderError, type WeatherProvider } from "../integrations/weatherProvider.js";
import { getWeatherLocation, confirmWeatherLocation } from "../application/workspace/weatherPositionService.js";
import { getServiceWeather } from "../application/workspace/serviceWeatherService.js";
import { rateLimit } from "./rateLimit.js";

export const weatherRoutes = Router();
export const weatherProviderFor = (res: Response) => res.locals.weatherProvider as WeatherProvider;
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const query = z.object({ date: z.iso.date(), slot: slotSchema }).strict();
weatherRoutes.get("/weather/location", async (_req, res, next) => {
  try { res.json(await getWeatherLocation(context(res).restaurantId, weatherProviderFor(res).configured)); }
  catch (error) { next(error); }
});
weatherRoutes.get("/weather/places", rateLimit(30, 60_000), async (req, res, next) => {
  try {
    const { q } = z.object({ q: z.string().trim().min(2).max(120) }).strict().parse(req.query);
    res.json({ places: await weatherProviderFor(res).search(q) });
  } catch (error) { next(error); }
});
weatherRoutes.post("/weather/location", rateLimit(20, 60_000), async (req, res, next) => {
  try {
    const { restaurantId, actorId } = context(res);
    res.json(await confirmWeatherLocation(restaurantId, actorId, confirmWeatherPositionSchema.parse(req.body), weatherProviderFor(res)));
  } catch (error) { next(error); }
});
weatherRoutes.get("/services/weather", async (req, res, next) => {
  try {
    const { date, slot } = query.parse(req.query);
    res.json(await getServiceWeather(context(res).restaurantId, date, slot, weatherProviderFor(res)));
  } catch (error) { next(error); }
});
weatherRoutes.use((error: unknown, _req: import("express").Request, res: Response, next: import("express").NextFunction) => {
  if (!(error instanceof WeatherProviderError)) { next(error); return; }
  if (error.retryAt) res.setHeader("Retry-After", String(Math.max(1, Math.ceil((Date.parse(error.retryAt) - Date.now()) / 1000))));
  res.status(503).json({ error: { code: "WEATHER_UNAVAILABLE", message: error.message } });
});
