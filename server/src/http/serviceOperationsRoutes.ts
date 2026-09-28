import { Router, type Response } from "express";
import { z } from "zod";
import { menuInputSchema, slotSchema } from "../../../shared/serviceOperations.js";
import { getServiceMenu, menuDto, saveServiceMenu } from "../application/workspace/serviceMenuService.js";
import { getOperationalForecast } from "../application/workspace/operationalForecastService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { refreshForecastWeather } from "../application/workspace/forecastWeatherService.js";
import type { WeatherProvider } from "../integrations/weatherProvider.js";

const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const serviceQuery = z.object({ date: z.iso.date(), slot: slotSchema });
export const serviceOperationsRoutes = Router();
serviceOperationsRoutes.get("/service-menu", async (req, res, next) => {
  try { const query = serviceQuery.parse(req.query); res.json(await getServiceMenu(context(res).restaurantId, query.date, query.slot)); }
  catch (error) { next(error); }
});
serviceOperationsRoutes.get("/service-menu/history", async (req, res, next) => {
  try {
    const query = serviceQuery.parse(req.query);
    const rows = await prisma.serviceMenuVersion.findMany({ where: { restaurantId: context(res).restaurantId,
      serviceDate: new Date(`${query.date}T00:00:00Z`), slot: query.slot }, orderBy: { revision: "desc" } });
    res.json(rows.map(menuDto));
  } catch (error) { next(error); }
});
serviceOperationsRoutes.post("/service-menu", async (req, res, next) => {
  try { const { restaurantId, actorId } = context(res); res.status(201).json(await saveServiceMenu(restaurantId, actorId, menuInputSchema.parse(req.body))); }
  catch (error) { next(error); }
});
serviceOperationsRoutes.get("/service-forecast", async (req, res, next) => {
  try {
    const query = z.object({ from: z.iso.date(), to: z.iso.date() }).parse(req.query);
    await refreshForecastWeather(context(res).restaurantId, query.from, res.locals.weatherProvider as WeatherProvider);
    res.json(await getOperationalForecast(context(res).restaurantId, query.from, query.to));
  } catch (error) { next(error); }
});
