import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { workspaceContext } from "./workspaceContext.js";

export const preferencesRoutes = Router();
const settingsSchema = z.object({
  wasteTarget: z.string().regex(/^\d+(\.\d+)?$/).refine((value) => Number(value) <= 10000),
  alertThreshold: z.string().regex(/^\d+(\.\d+)?$/).refine((value) => Number(value) <= 100),
  showTrends: z.boolean(), showAI: z.boolean(), showROI: z.boolean(),
}).strict();
preferencesRoutes.get("/preferences", async (_req, res) => {
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: workspaceContext(res).restaurantId, kind: "preferences" } } });
  res.json(document?.data ?? null);
});
preferencesRoutes.post("/preferences", async (req, res) => {
  const { settings, initializeOnly } = z.object({ settings: settingsSchema, initializeOnly: z.boolean().default(false) }).strict().parse(req.body);
  const document = await prisma.workspaceDocument.upsert({
    where: { restaurantId_kind: { restaurantId: workspaceContext(res).restaurantId, kind: "preferences" } },
    create: { restaurantId: workspaceContext(res).restaurantId, kind: "preferences", data: settings },
    update: initializeOnly ? {} : { data: settings, revision: { increment: 1 } },
  });
  res.json(document.data);
});
