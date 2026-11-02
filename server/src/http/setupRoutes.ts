import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { restaurantSchema } from "./restaurantSchema.js";
import { sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { resolveWorkspace, workspaceCapabilities } from "../application/workspace/workspaceIdentity.js";

const stepSchema = z.enum(["team", "suppliers", "review"]);
const progressSchema = z.object({ version: z.literal(1), step: stepSchema.nullable() }).strict();
const transitionSchema = z.object({ expectedUserId: z.uuid(), expectedStep: stepSchema, nextStep: stepSchema.nullable(), expectedRevision: z.number().int().positive() }).strict();
const allowedTransitions: Record<z.infer<typeof stepSchema>, (z.infer<typeof stepSchema> | null)[]> = {
  team: ["suppliers"], suppliers: ["team", "review"], review: ["suppliers", null],
};
const sessionChanged = (res: import("express").Response) => res.status(409).json({ error: { code: "SESSION_CHANGED", message: "Votre session a changé. Rechargez la page avant de continuer." } });

export const setupRoutes = Router();
setupRoutes.get("/", async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const workspace = await resolveWorkspace(user.id);
    const document = workspace?.role === "owner" ? await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: workspace.restaurantId, kind: "onboarding" } } }) : null;
    const step = document ? progressSchema.parse(document.data).step : null;
    res.json({ configured: workspace !== null, userId: user.id, step, revision: document?.revision ?? 0,
      role: workspace?.role ?? null, restaurantName: workspace?.restaurantName ?? null, capabilities: workspace ? workspaceCapabilities(workspace.role) : null });
  } catch (error) { next(error); }
});
setupRoutes.post("/", async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const input = restaurantSchema.extend({ expectedUserId: z.uuid() }).safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
    const { expectedUserId, ...restaurant } = input.data;
    if (expectedUserId !== user.id) { sessionChanged(res); return; }
    const created = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`);
      if (await tx.membership.findUnique({ where: { userId: user.id } })) return false;
      const saved = await tx.restaurant.create({ data: { ownerId: user.id, ...restaurant } });
      await tx.workspaceDocument.create({ data: { restaurantId: saved.id, kind: "onboarding", revision: 1, data: { version: 1, step: "team" } } });
      return true;
    });
    if (!created) { res.status(409).json({ error: { code: "ALREADY_MEMBER", message: "Ce compte appartient déjà à un établissement." } }); return; }
    res.status(201).json({ configured: true, userId: user.id, step: "team", revision: 1 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: { code: "SETUP_ALREADY_COMPLETED", message: "Votre établissement existe déjà." } }); return;
    }
    next(error);
  }
});

setupRoutes.patch("/step", async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const input = transitionSchema.safeParse(req.body);
    if (!input.success || !allowedTransitions[input.data.expectedStep].includes(input.data.nextStep)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return;
    }
    const { expectedUserId, expectedStep, nextStep, expectedRevision } = input.data;
    if (expectedUserId !== user.id) { sessionChanged(res); return; }
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: user.id }, select: { id: true } });
    if (!restaurant) { res.status(409).json({ error: { code: "SETUP_REQUIRED", message: "Créez votre établissement pour continuer." } }); return; }
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurant.id} FOR UPDATE`);
      const where = { restaurantId_kind: { restaurantId: restaurant.id, kind: "onboarding" } };
      const document = await tx.workspaceDocument.findUnique({ where });
      if (!document) return false;
      const current = progressSchema.parse(document.data).step;
      if (current === nextStep && document.revision === expectedRevision + 1) return true;
      if (current !== expectedStep || document.revision !== expectedRevision) return false;
      await tx.workspaceDocument.update({ where, data: { data: { version: 1, step: nextStep }, revision: { increment: 1 } } });
      return true;
    });
    if (!result) { res.status(409).json({ error: { code: "REVISION_CONFLICT", message: "La configuration a changé. Rechargez la page avant de continuer." } }); return; }
    res.json({ configured: true, userId: user.id, step: nextStep, revision: expectedRevision + 1 });
  } catch (error) { next(error); }
});
