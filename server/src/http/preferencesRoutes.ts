import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";

export const preferencesRoutes = Router();
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
const settingsSchema = z.object({
  wasteTarget: z.string().regex(/^\d+(\.\d+)?$/).refine((value) => Number(value) <= 10000),
  alertThreshold: z.string().regex(/^\d+(\.\d+)?$/).refine((value) => Number(value) <= 100),
  showTrends: z.boolean(), showAI: z.boolean(), showROI: z.boolean(),
}).strict();
preferencesRoutes.get("/preferences", async (_req, res, next) => {
  try {
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: restaurantId(res), kind: "preferences" } } });
    res.json(document?.data ?? null);
  } catch (error) { next(error); }
});
preferencesRoutes.post("/preferences", async (req, res, next) => {
  try {
    const { settings, initializeOnly } = z.object({ settings: settingsSchema, initializeOnly: z.boolean().default(false) }).strict().parse(req.body);
    const document = await prisma.workspaceDocument.upsert({
      where: { restaurantId_kind: { restaurantId: restaurantId(res), kind: "preferences" } },
      create: { restaurantId: restaurantId(res), kind: "preferences", data: settings },
      update: initializeOnly ? {} : { data: settings, revision: { increment: 1 } },
    });
    res.json(document.data);
  } catch (error) { next(error); }
});
