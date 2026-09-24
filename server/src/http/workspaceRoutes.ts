import { reportRoutes } from "./reportRoutes.js";
import { salesRoutes } from "./salesRoutes.js";
import { menuRoutes } from "./menuRoutes.js";
import { restaurantRoutes } from "./restaurantRoutes.js";
import { invoiceRoutes } from "./invoiceRoutes.js";
import { notificationRoutes } from "./notificationRoutes.js";
import { cartRoutes } from "./cartRoutes.js";
import { orderRoutes } from "./orderRoutes.js";
import { preferencesRoutes } from "./preferencesRoutes.js";
import { workspaceReadRoutes } from "./workspaceReadRoutes.js";
import { Router, type Response } from "express";
import { z } from "zod";
import { sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { adjustStock, createProduct, editProduct, getCatalog, WorkspaceError } from "../application/workspace/catalogService.js";
import { getStockCounts, recordStockCount } from "../application/workspace/stockCountService.js";
import { createRecipe, getRecipes, recordProduction, updateRecipe } from "../application/workspace/recipeService.js";
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

workspaceRoutes.use(workspaceReadRoutes);
workspaceRoutes.use(preferencesRoutes);
workspaceRoutes.use(orderRoutes);
workspaceRoutes.use(cartRoutes);
workspaceRoutes.use(notificationRoutes);
workspaceRoutes.use(invoiceRoutes);
workspaceRoutes.use(restaurantRoutes);
workspaceRoutes.use(menuRoutes);
workspaceRoutes.use(reportRoutes);
workspaceRoutes.use(salesRoutes);

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
}).strict().refine((data) => data.reason !== "loss" || data.delta < 0);
const editProductSchema = z.object({
  expectedRevision: z.number().int().positive(), name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80), minThreshold: quantity,
  supplierId: z.string().min(1).max(100),
  pricePerUnit: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001),
}).strict();
const stockCountSchema = z.object({
  operationId: z.uuid(), expectedStockRevision: z.number().int().positive(),
  expectedUnit: z.enum(["kg", "L", "dz", "pcs"]), countedQuantity: quantity,
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
workspaceRoutes.patch("/products/:id", async (req, res, next) => {
  try {
    const data = editProductSchema.parse(req.body);
    res.json(await editProduct(context(res).restaurantId, String(req.params.id), data));
  } catch (error) { next(error); }
});
workspaceRoutes.get("/products/:id/counts", async (req, res, next) => {
  try { res.json(await getStockCounts(context(res).restaurantId, String(req.params.id))); } catch (error) { next(error); }
});
workspaceRoutes.post("/products/:id/counts", async (req, res, next) => {
  try {
    const input = stockCountSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await recordStockCount(restaurantId, actorId, String(req.params.id), input));
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
    res.json(data.map((movement) => {
      const legacySourceId = movement.operationId.match(/^restaurant-simulation-v1:invoice:([a-f0-9]{24}):/)?.[1];
      return { id: movement.id, delta: Number(movement.delta), reason: movement.reason, createdAt: movement.createdAt,
        ...(movement.sourceDocumentId ?? legacySourceId ? { sourceDocumentId: movement.sourceDocumentId ?? legacySourceId } : {}),
        ...(movement.sourceContentHash ? { sourceContentHash: movement.sourceContentHash } : {}),
        ...(movement.sourceDocumentRevision !== null ? { sourceDocumentRevision: movement.sourceDocumentRevision } : {}),
        ...(movement.invoiceDocumentId ? { invoiceDocumentId: movement.invoiceDocumentId } : {}),
        ...(movement.invoiceRevision !== null ? { invoiceRevision: movement.invoiceRevision } : {}),
        ...(movement.stockCountId ? { stockCountId: movement.stockCountId } : {}),
      };
    }));
  } catch (error) { next(error); }
});
workspaceRoutes.get("/recipes", async (_req, res, next) => {
  try { res.json(await getRecipes(context(res).restaurantId)); } catch (error) { next(error); }
});
const recipeIngredientSchema = z.object({ productId: z.string().trim().min(1).max(100),
  quantity: z.number().finite().min(0.001).max(1_000_000).multipleOf(0.001) }).strict();
const recipeMutationSchema = z.object({
  operationId: z.uuid(), name: z.string().trim().min(1).max(120), category: z.enum(["Plat", "Dessert", "Entrée"]),
  prepTime: z.number().int().min(0).max(10080), yieldPortions: z.number().int().min(1).max(10000),
  effectiveFrom: z.iso.date(), ingredients: z.array(recipeIngredientSchema).min(1).max(100),
}).strict();
workspaceRoutes.post("/recipes", async (req, res, next) => {
  try {
    const { operationId, ...input } = recipeMutationSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await createRecipe(restaurantId, actorId, operationId, input));
  } catch (error) { next(error); }
});
workspaceRoutes.patch("/recipes/:id", async (req, res, next) => {
  try {
    const { operationId, expectedRevision, ...values } = recipeMutationSchema.safeExtend({
      expectedRevision: z.number().int().positive(),
    }).parse(req.body);
    const id = z.string().trim().min(1).max(100).parse(req.params.id);
    const { restaurantId, actorId } = context(res);
    res.json(await updateRecipe(restaurantId, actorId, id, expectedRevision, operationId, values));
  } catch (error) { next(error); }
});
const productionSchema = z.object({
  operationId: z.uuid(), recipeId: z.string().min(1).max(100).optional(),
  expectedRecipeRevision: z.number().int().positive().optional(),
  recipeName: z.string().trim().min(1).max(120), portions: z.number().int().min(1).max(10000),
  prepTime: z.number().int().min(0).max(10080), notes: z.string().max(4000),
  date: z.iso.date(), kind: z.enum(["production", "record", "refusal"]),
}).strict()
  .refine((data) => data.kind === "record"
    ? (data.recipeId === undefined && data.expectedRecipeRevision === undefined) ||
      (data.recipeId !== undefined && data.expectedRecipeRevision !== undefined)
    : data.recipeId !== undefined && data.expectedRecipeRevision !== undefined)
  .refine((data) => data.date <= new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()));
workspaceRoutes.get("/productions", async (_req, res, next) => {
  try { res.json(await prisma.production.findMany({ where: { restaurantId: context(res).restaurantId },
    include: { recipeVersion: { select: { version: true, effectiveFrom: true, yieldPortions: true } } },
    orderBy: { date: "desc" } })); } catch (error) { next(error); }
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
