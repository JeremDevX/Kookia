import { Router } from "express";
import { getWeatherSources } from "../application/workspace/serviceWeatherService.js";
import { weatherProviderFor } from "./weatherRoutes.js";

export const sourceRoutes = Router();

const sources = [
  { kind: "pos", state: "not_connected", lastSuccessAt: null },
  { kind: "ticket_ocr", state: "not_connected", lastSuccessAt: null },
  { kind: "geocoding", state: "not_connected", lastSuccessAt: null },
  { kind: "weather", state: "not_connected", lastSuccessAt: null },
  { kind: "events", state: "not_connected", lastSuccessAt: null },
] as const;

sourceRoutes.get("/sources", async (_req, res, next) => {
  try {
    const { restaurantId } = res.locals.workspace as { restaurantId: string };
    const weather = await getWeatherSources(restaurantId, weatherProviderFor(res).configured);
    res.json({ sources: sources.map(source => weather.find(entry => entry.kind === source.kind) ?? source) });
  } catch (error) { next(error); }
});
