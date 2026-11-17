import { Router } from "express";
import { z } from "zod";
import { menuInputSchema, slotSchema } from "../../../shared/serviceOperations.js";
import { getServiceMenu, menuDto, saveServiceMenu } from "../application/workspace/serviceMenuService.js";
import { getOperationalForecast } from "../application/workspace/operationalForecastService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { refreshForecastWeather } from "../application/workspace/forecastWeatherService.js";
import type { WeatherProvider } from "../integrations/weatherProvider.js";
import { workspaceContext as context } from "./workspaceContext.js";

const serviceQuery = z.object({ date: z.iso.date(), slot: slotSchema });
export const serviceOperationsRoutes = Router();
serviceOperationsRoutes.get("/service-menu", async (req, res) => {
  const query = serviceQuery.parse(req.query); res.json(await getServiceMenu(context(res).restaurantId, query.date, query.slot));
});
serviceOperationsRoutes.get("/service-menu/history", async (req, res) => {
  const query = serviceQuery.parse(req.query);
  const rows = await prisma.serviceMenuVersion.findMany({ where: { restaurantId: context(res).restaurantId,
    serviceDate: new Date(`${query.date}T00:00:00Z`), slot: query.slot }, orderBy: { revision: "desc" } });
  res.json(rows.map(menuDto));
});
serviceOperationsRoutes.post("/service-menu", async (req, res) => {
  const { restaurantId, actorId } = context(res); res.status(201).json(await saveServiceMenu(restaurantId, actorId, menuInputSchema.parse(req.body)));
});
serviceOperationsRoutes.get("/service-forecast", async (req, res) => {
  const query = z.object({ from: z.iso.date(), to: z.iso.date() }).parse(req.query);
  await refreshForecastWeather(context(res).restaurantId, query.from, res.locals.weatherProvider as WeatherProvider);
  res.json(await getOperationalForecast(context(res).restaurantId, query.from, query.to));
});
