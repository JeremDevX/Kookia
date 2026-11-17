import { Router } from "express";
import { z } from "zod";
import { formatParisDate } from "../../../shared/parisDate.js";
import { createRecipe, getRecipes, recordProduction, updateRecipe } from "../application/workspace/recipeService.js";
import { createRecipeCandidate, decideRecipeCandidate, getRecipeCandidates, updateRecipeCandidate } from "../application/workspace/recipeCandidateService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { workspaceContext as context } from "./workspaceContext.js";

export const recipeRoutes = Router();

recipeRoutes.get("/recipes", async (_req, res) => {
  res.json(await getRecipes(context(res).restaurantId));
});
const recipeIngredientSchema = z.object({ productId: z.string().trim().min(1).max(100),
  quantity: z.number().finite().min(0.001).max(1_000_000).multipleOf(0.001),
  netQuantity: z.number().finite().min(0).max(1_000_000).multipleOf(.001).nullable().optional(),
}).strict().refine(value => value.netQuantity == null || value.netQuantity <= value.quantity);
const recipeValuesSchema = z.object({
  name: z.string().trim().min(1).max(120), category: z.enum(["Plat", "Dessert", "Entrée", "Boisson"]),
  prepTime: z.number().int().min(0).max(10080), yieldPortions: z.number().int().min(1).max(10000),
  effectiveFrom: z.iso.date(), ingredients: z.array(recipeIngredientSchema).min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(2000)).max(100).optional(),
}).strict();
const recipeMutationSchema = recipeValuesSchema.extend({ operationId: z.uuid() });
const recipeCreateSchema = recipeMutationSchema.extend({ sourceReceiptLineId: z.uuid().optional() });
const recipeCandidateInputSchema = recipeValuesSchema.omit({ steps: true }).extend({ ingredients: z.array(z.object({
  productId: z.string().trim().min(1).max(100), quantity: z.number().finite().min(0.001).max(1_000_000).multipleOf(0.001),
  sourceDocumentId: z.string().regex(/^[a-f0-9]{24}$/), sourceLineNumber: z.number().int().positive(),
}).strict()).min(1).max(100) }).strict();
recipeRoutes.post("/recipes", async (req, res) => {
  const { operationId, sourceReceiptLineId, ...input } = recipeCreateSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await createRecipe(restaurantId, actorId, operationId, input, sourceReceiptLineId));
});
recipeRoutes.patch("/recipes/:id", async (req, res) => {
  const { operationId, expectedRevision, ...values } = recipeMutationSchema.safeExtend({
    expectedRevision: z.number().int().positive(),
  }).parse(req.body);
  const id = z.string().trim().min(1).max(100).parse(req.params.id);
  const { restaurantId, actorId } = context(res);
  res.json(await updateRecipe(restaurantId, actorId, id, expectedRevision, operationId, values));
});
recipeRoutes.get("/recipe-candidates", async (_req, res) => {
  res.json(await getRecipeCandidates(context(res).restaurantId));
});
recipeRoutes.post("/recipe-candidates", async (req, res) => {
  const { operationId, ...input } = recipeCandidateInputSchema.extend({ operationId: z.uuid() }).parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await createRecipeCandidate(restaurantId, actorId, operationId, input));
});
recipeRoutes.patch("/recipe-candidates/:id", async (req, res) => {
  const { operationId, expectedRevision, ...input } = recipeCandidateInputSchema.extend({
    operationId: z.uuid(), expectedRevision: z.number().int().positive(),
  }).parse(req.body);
  const id = z.uuid().parse(req.params.id);
  const { restaurantId, actorId } = context(res);
  res.json(await updateRecipeCandidate(restaurantId, actorId, id, expectedRevision, operationId, input));
});
recipeRoutes.post("/recipe-candidates/:id/decision", async (req, res) => {
  const { operationId, expectedRevision, action } = z.object({ operationId: z.uuid(),
    expectedRevision: z.number().int().positive(), action: z.enum(["confirm", "reject"]) }).strict().parse(req.body);
  const id = z.uuid().parse(req.params.id);
  const { restaurantId, actorId } = context(res);
  res.json(await decideRecipeCandidate(restaurantId, actorId, id, expectedRevision, operationId, action));
});
const productionSchema = z.object({
  operationId: z.uuid(), recipeId: z.string().min(1).max(100).optional(),
  expectedRecipeRevision: z.number().int().positive().optional(),
  recipeName: z.string().trim().min(1).max(120), portions: z.number().int().min(1).max(10000),
  prepTime: z.number().int().min(0).max(10080), notes: z.string().max(4000),
  date: z.iso.date(), serviceSlot: z.enum(["lunch", "dinner"]).nullable().optional(), kind: z.enum(["production", "record", "refusal"]),
}).strict()
  .refine((data) => data.kind === "record"
    ? (data.recipeId === undefined && data.expectedRecipeRevision === undefined) ||
      (data.recipeId !== undefined && data.expectedRecipeRevision !== undefined)
    : data.recipeId !== undefined && data.expectedRecipeRevision !== undefined)
  .refine((data) => data.date <= formatParisDate());
recipeRoutes.get("/productions", async (_req, res) => {
  res.json(await prisma.production.findMany({ where: { restaurantId: context(res).restaurantId },
    include: { recipeVersion: { select: { version: true, effectiveFrom: true, yieldPortions: true } } },
    orderBy: { date: "desc" } }));
});
recipeRoutes.post("/productions", async (req, res) => {
  const input = productionSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await recordProduction(restaurantId, actorId, input));
});
