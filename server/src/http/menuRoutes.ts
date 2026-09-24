import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import initialMenu from "../infrastructure/database/seed/menu.json" with { type: "json" };
import { WorkspaceError } from "../application/workspace/catalogService.js";
import { createMenuIdeas, getMenuSurplusOptions } from "../application/workspace/menuIdeaService.js";
const menuSchema = z.object({ starter: z.string().trim().min(1).max(200), main: z.string().trim().min(1).max(200), dessert: z.string().trim().min(1).max(200),
  stockOptimizationText: z.string(), reclaimedStockKg: z.number(), criticalWindowHours: z.number(), source: z.literal("demo"),
  status: z.enum(["draft", "validated"]), validatedAt: z.iso.datetime().optional() });
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const menuIdeasRequestSchema = z.object({
  operationId: z.uuid(), surplus: z.array(z.object({ productId: z.string().min(1).max(100), stockCountId: z.uuid(),
    expectedStockRevision: z.number().int().positive(), quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001),
  }).strict()).min(1).max(5),
}).strict().refine(({ surplus }) => new Set(surplus.map(({ productId }) => productId)).size === surplus.length);
async function getMenu(restaurantId: string) {
  const document = await prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind: "menu" } }, create: { restaurantId, kind: "menu", data: initialMenu }, update: {} });
  return { ...menuSchema.parse(document.data), revision: document.revision };
}
export const menuRoutes = Router();
menuRoutes.get("/menu", async (_req, res, next) => { try { res.json(await getMenu(context(res).restaurantId)); } catch (error) { next(error); } });
menuRoutes.get("/menu/surplus-options", async (_req, res, next) => {
  try { res.json(await getMenuSurplusOptions(context(res).restaurantId)); } catch (error) { next(error); }
});
menuRoutes.post("/menu/ideas", async (req, res, next) => {
  try {
    const input = menuIdeasRequestSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.json(await createMenuIdeas(restaurantId, actorId, input));
  } catch (error) { next(error); }
});
menuRoutes.post("/menu", async (req, res, next) => {
  try {
    const input = menuSchema.pick({ starter: true, main: true, dessert: true }).extend({ revision: z.number().int().nonnegative(), validate: z.boolean() }).strict().parse(req.body);
    const { restaurantId, actorId } = context(res);
    await getMenu(restaurantId);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
      const document = await tx.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: { restaurantId, kind: "menu" } } });
      const original = menuSchema.parse(document.data);
      const same = original.starter === input.starter && original.main === input.main && original.dessert === input.dessert;
      if (input.validate && original.status === "validated" && same) return { ...original, revision: document.revision };
      if (document.revision !== input.revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Le menu a changé. Rechargez-le avant de continuer.");
      const { validatedAt: _previous, ...base } = original;
      void _previous;
      const menu = { ...base, starter: input.starter, main: input.main, dessert: input.dessert,
        status: input.validate ? "validated" : "draft", ...(input.validate ? { validatedAt: new Date().toISOString() } : {}) };
      const saved = await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId, kind: "menu" } }, data: { data: menu, revision: { increment: 1 } } });
      if (input.validate) await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: `menu:${saved.revision}`, decision: "menu_validated", snapshot: { original, reviewed: menu } } });
      return { ...menu, revision: saved.revision };
    });
    res.json(result);
  } catch (error) { next(error); }
});
