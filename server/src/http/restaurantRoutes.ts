import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { WorkspaceError } from "../application/workspace/catalogService.js";
import { invalidateWeatherLocation, locationFingerprint } from "../application/workspace/weatherPositionService.js";
import { lockWeatherWorkspace } from "../application/workspace/weatherStorage.js";

export const restaurantRoutes = Router();
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
const restaurantSelect = { name: true, type: true, address: true, city: true, phone: true, email: true, dailyCovers: true, hasTerrace: true } as const;
const restaurantSchema = z.object({
  name: z.string().trim().min(1).max(120), type: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300), city: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40), email: z.email().max(254), dailyCovers: z.number().int().min(0).max(100000),
  hasTerrace: z.boolean().nullable().optional(),
}).strict();
const supplierSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.email().max(254), phone: z.string().trim().max(40),
  deliveryWeekdays: z.array(z.number().int().min(0).max(6)).max(7).refine((days) => new Set(days).size === days.length).optional(),
  leadTimeDays: z.number().int().min(0).max(60).nullable().optional(),
  orderCutoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
}).strict();
restaurantRoutes.get("/restaurant", async (_req, res, next) => {
  try {
    res.json(await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId(res) }, select: restaurantSelect }));
  } catch (error) { next(error); }
});
restaurantRoutes.patch("/restaurant", async (req, res, next) => {
  try {
    const input = restaurantSchema.parse(req.body);
    const saved = await prisma.$transaction(async tx => {
      const id = restaurantId(res);
      await lockWeatherWorkspace(tx, id);
      const previous = await tx.restaurant.findUniqueOrThrow({ where: { id } });
      const updated = await tx.restaurant.update({ where: { id }, data: input, select: restaurantSelect });
      if (locationFingerprint(previous) !== locationFingerprint(input)) await invalidateWeatherLocation(tx, id);
      return updated;
    });
    res.json(saved);
  } catch (error) { next(error); }
});
restaurantRoutes.post("/suppliers", async (req, res, next) => {
  try {
    const { id, ...input } = supplierSchema.extend({ id: z.uuid() }).parse(req.body);
    const supplier = await prisma.supplier.upsert({ where: { restaurantId_id: { restaurantId: restaurantId(res), id } },
      create: { restaurantId: restaurantId(res), id, ...input }, update: input });
    res.status(201).json({ id: supplier.id, ...input });
  } catch (error) { next(error); }
});
restaurantRoutes.patch("/suppliers/:id", async (req, res, next) => {
  try {
    const input = supplierSchema.parse(req.body);
    const id = z.string().min(1).max(100).parse(req.params.id);
    const updated = await prisma.supplier.updateMany({ where: { restaurantId: restaurantId(res), id }, data: input });
    if (!updated.count) throw new WorkspaceError(404, "NOT_FOUND", "Fournisseur introuvable dans votre espace.");
    res.json({ id, ...input });
  } catch (error) { next(error); }
});
