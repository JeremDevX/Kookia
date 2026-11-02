import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { restaurantSchema } from "./restaurantSchema.js";
import { sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { prisma } from "../infrastructure/database/prisma.js";

export const setupRoutes = Router();
setupRoutes.get("/", async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: user.id }, select: { id: true } });
    res.json({ configured: restaurant !== null, userId: user.id });
  } catch (error) { next(error); }
});
setupRoutes.post("/", async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const input = restaurantSchema.extend({ expectedUserId: z.uuid() }).safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
    const { expectedUserId, ...restaurant } = input.data;
    if (expectedUserId !== user.id) { res.status(409).json({ error: { code: "SESSION_CHANGED", message: "Votre session a changé. Reconnectez-vous avant de continuer." } }); return; }
    await prisma.restaurant.create({ data: { ownerId: user.id, ...restaurant } });
    res.status(201).json({ configured: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: { code: "SETUP_ALREADY_COMPLETED", message: "Votre établissement existe déjà." } }); return;
    }
    next(error);
  }
});
