import { Router, type Response } from "express";
import { z } from "zod";
import { sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { adjustStock, createProduct, getCatalog, WorkspaceError } from "../application/workspace/catalogService.js";
import { getRecipes, recordProduction } from "../application/workspace/recipeService.js";
import { prisma } from "../infrastructure/database/prisma.js";

interface WorkspaceContext { restaurantId: string; actorId: string; }
const context = (res: Response): WorkspaceContext => res.locals.workspace as WorkspaceContext;

export const workspaceRoutes = Router();
workspaceRoutes.use(async (req, res, next) => {
  try {
    const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
    const restaurant = await ensureWorkspace(user.id);
    res.locals.workspace = { restaurantId: restaurant.id, actorId: user.id };
    next();
  } catch (error) { next(error); }
});

const quantity = z.number().finite().min(0).max(1_000_000).multipleOf(0.001);
const newProductSchema = z.object({
  operationId: z.uuid(), name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80), currentStock: quantity,
  unit: z.enum(["kg", "L", "dz", "pcs"]), minThreshold: quantity,
  supplierId: z.string().min(1).max(100), pricePerUnit: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001),
}).strict();
const stockSchema = z.object({
  operationId: z.uuid(), delta: z.number().finite().min(-1_000_000).max(1_000_000).multipleOf(0.001).refine((value) => value !== 0),
  reason: z.enum(["adjustment", "loss"]).default("adjustment"),
}).strict();

workspaceRoutes.get("/catalog", async (_req, res, next) => {
  try { res.json(await getCatalog(context(res).restaurantId)); } catch (error) { next(error); }
});
workspaceRoutes.post("/products", async (req, res, next) => {
  try {
    const { operationId, ...data } = newProductSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await createProduct(restaurantId, actorId, data, operationId));
  } catch (error) { next(error); }
});
workspaceRoutes.post("/products/:id/stock", async (req, res, next) => {
  try {
    const data = stockSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.json(await adjustStock(restaurantId, actorId, String(req.params.id), data.delta, data.operationId, data.reason));
  } catch (error) { next(error); }
});
workspaceRoutes.get("/products/:id/movements", async (req, res, next) => {
  try {
    const data = await prisma.stockMovement.findMany({ where: { restaurantId: context(res).restaurantId, productId: String(req.params.id) }, orderBy: { createdAt: "desc" } });
    res.json(data.map(({ id, delta, reason, createdAt }) => ({ id, delta: Number(delta), reason, createdAt })));
  } catch (error) { next(error); }
});
workspaceRoutes.get("/recipes", async (_req, res, next) => {
  try { res.json(await getRecipes(context(res).restaurantId)); } catch (error) { next(error); }
});
const productionSchema = z.object({
  operationId: z.uuid(), recipeId: z.string().min(1).max(100).optional(),
  recipeName: z.string().trim().min(1).max(120), portions: z.number().int().min(1).max(10000),
  prepTime: z.number().int().min(0).max(10080), notes: z.string().max(4000),
  date: z.iso.date(), kind: z.enum(["production", "record", "refusal"]),
}).strict();
workspaceRoutes.get("/productions", async (_req, res, next) => {
  try { res.json(await prisma.production.findMany({ where: { restaurantId: context(res).restaurantId }, orderBy: { date: "desc" } })); } catch (error) { next(error); }
});
workspaceRoutes.post("/productions", async (req, res, next) => {
  try {
    const input = productionSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await recordProduction(restaurantId, actorId, input));
  } catch (error) { next(error); }
});
workspaceRoutes.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (error instanceof z.ZodError) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
  if (error instanceof WorkspaceError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
  next(error);
});
