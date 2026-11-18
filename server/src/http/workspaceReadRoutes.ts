import { Router } from "express";
import { readWorkshopForecast } from "../application/workspace/workshopForecastService.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { workspaceContext } from "./workspaceContext.js";

export const workspaceReadRoutes = Router();
for (const kind of ["analytics", "activity"] as const) {
  workspaceReadRoutes.get(`/${kind}`, async (_req, res) => {
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: workspaceContext(res).restaurantId, kind } } });
    res.json(document?.data ?? null);
  });
}

workspaceReadRoutes.get("/insights", async (_req, res) => {
  const id = workspaceContext(res).restaurantId;
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: id, kind: "insights" } } });
  res.json(document?.data ?? null);
});

workspaceReadRoutes.get("/dashboard/forecast", async (_req, res) => {
  const { restaurantId } = workspaceContext(res);
  const enabled = env.WORKSHOP_FORECAST_ENABLED === "true" && env.WORKSHOP_IMPORT_TOKEN && env.WORKSHOP_IMPORT_RESTAURANT_ID === restaurantId;
  const forecast = enabled ? await readWorkshopForecast(restaurantId, env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE === "true") : null;
  res.set("Cache-Control", "private, no-store").json({ forecast });
});
