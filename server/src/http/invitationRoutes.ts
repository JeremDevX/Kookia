import { Prisma } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { env, sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createSessionToken, hashSessionToken } from "../security/sessionToken.js";
import { rateLimit } from "./rateLimit.js";

const fields = { id: true, role: true, createdAt: true, expiresAt: true, revokedAt: true, acceptedAt: true } as const;
const context = (res: import("express").Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const requireOwner = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { actorId, restaurantId } = context(res);
    if (!await prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: actorId }, select: { id: true } })) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès réservé au propriétaire." } }); return;
    }
    next();
  } catch (error) { next(error); }
};
export const invitationOwnerRoutes = Router();
invitationOwnerRoutes.use(requireOwner);
invitationOwnerRoutes.get("/", async (_req, res, next) => {
  try { res.set("Cache-Control", "no-store").json(await prisma.invitation.findMany({ where: { restaurantId: context(res).restaurantId }, select: fields, orderBy: { createdAt: "desc" } })); } catch (error) { next(error); }
});
invitationOwnerRoutes.post("/", rateLimit(20, 60_000), async (req, res, next) => {
  try {
    const input = z.object({ role: z.enum(["chef", "kitchen"]) }).strict().parse(req.body);
    const token = createSessionToken();
    const invitation = await prisma.invitation.create({ data: { restaurantId: context(res).restaurantId, role: input.role, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 7 * 86400000) }, select: fields });
    res.set("Cache-Control", "no-store").status(201).json({ ...invitation, link: `${env.APP_ORIGIN}/invite#token=${token}` });
  } catch (error) { next(error); }
});
invitationOwnerRoutes.delete("/:id", async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    const result = await prisma.invitation.updateMany({ where: { id, restaurantId: context(res).restaurantId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Invitation introuvable ou inactive." } }); return; }
    res.status(204).send();
  } catch (error) { next(error); }
});

export const invitationAcceptRoutes = Router();
invitationAcceptRoutes.post("/accept", rateLimit(20, 60_000), async (req, res, next) => {
  try {
    let user;
    try { user = await getUserBySessionToken(req.cookies[sessionCookieName]); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") { res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentification requise." } }); return; }
      throw error;
    }
    if (req.get("X-Expected-User-Id") !== user.id) { res.status(409).json({ error: { code: "SESSION_CHANGED", message: "Votre session a changé. Rechargez la page avant de continuer." } }); return; }
    const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
    const hash = hashSessionToken(parsed.data.token);
    const outcome = await prisma.$transaction(async tx => {
      const users = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`);
      if (!users.length) return "invalid";
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hash } });
      if (!invitation) return "invalid";
      const restaurants = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${invitation.restaurantId} FOR KEY SHARE`);
      if (!restaurants.length) return "invalid";
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Invitation" WHERE id = ${invitation.id} FOR UPDATE`);
      const current = await tx.invitation.findUnique({ where: { id: invitation.id } });
      if (!current || current.revokedAt || current.acceptedAt || current.expiresAt <= new Date()) return "invalid";
      if (await tx.restaurant.findUnique({ where: { ownerId: user.id } }) || await tx.membership.findUnique({ where: { userId: user.id } })) return "member";
      await tx.membership.create({ data: { userId: user.id, restaurantId: current.restaurantId, role: current.role } });
      await tx.invitation.update({ where: { id: current.id }, data: { acceptedAt: new Date() } });
      return "ok";
    });
    if (outcome !== "ok") { res.status(409).json({ error: { code: outcome === "member" ? "ALREADY_MEMBER" : "INVITATION_INVALID", message: outcome === "member" ? "Ce compte appartient déjà à un établissement." : "Cette invitation n’est plus disponible." } }); return; }
    res.set("Cache-Control", "no-store").status(201).json({ accepted: true });
  } catch (error) { next(error); }
});

export const membershipOwnerRoutes = Router();
membershipOwnerRoutes.use(requireOwner);
membershipOwnerRoutes.get("/", async (_req, res, next) => {
  try {
    const members = await prisma.membership.findMany({ where: { restaurantId: context(res).restaurantId },
      select: { userId: true, role: true, createdAt: true, user: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } });
    res.set("Cache-Control", "no-store").json(members);
  } catch (error) { next(error); }
});
membershipOwnerRoutes.delete("/:userId", async (req, res, next) => {
  try {
    const userId = z.uuid().parse(req.params.userId);
    const deleted = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`);
      return tx.membership.deleteMany({ where: { userId, restaurantId: context(res).restaurantId } });
    });
    if (!deleted.count) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Membre introuvable." } }); return; }
    res.status(204).send();
  } catch (error) { next(error); }
});
