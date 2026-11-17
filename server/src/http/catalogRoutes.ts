import { Router } from "express";
import { z } from "zod";
import { adjustStock, createProduct, editProduct, getCatalog } from "../application/workspace/catalogService.js";
import { getStockCounts, recordStockCount } from "../application/workspace/stockCountService.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { workspaceContext as context } from "./workspaceContext.js";

export const catalogRoutes = Router();

const quantity = z.number().finite().min(0).max(1_000_000).multipleOf(0.001);
const newProductSchema = z.object({
  operationId: z.uuid(), name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80), currentStock: quantity,
  unit: z.enum(["kg", "L", "dz", "pcs"]), minThreshold: quantity,
  supplierId: z.string().min(1).max(100), pricePerUnit: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001),
  orderPackQuantity: z.number().finite().positive().max(1_000_000).multipleOf(.001).nullable().optional(),
}).strict();
const stockSchema = z.object({
  operationId: z.uuid(), delta: z.number().finite().min(-1_000_000).max(1_000_000).multipleOf(0.001).refine((value) => value !== 0),
  reason: z.enum(["adjustment", "loss"]).default("adjustment"),
  expectedStockRevision: z.number().int().positive(), expectedUnit: z.enum(["kg", "L", "dz", "pcs"]),
}).strict().refine((data) => data.reason !== "loss" || data.delta < 0);
const editProductSchema = z.object({
  expectedRevision: z.number().int().positive(), name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80), minThreshold: quantity,
  supplierId: z.string().min(1).max(100),
  pricePerUnit: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001),
  orderPackQuantity: z.number().finite().positive().max(1_000_000).multipleOf(.001).nullable().optional(),
}).strict();
const stockCountSchema = z.object({
  operationId: z.uuid(), expectedStockRevision: z.number().int().positive(),
  expectedUnit: z.enum(["kg", "L", "dz", "pcs"]), countedQuantity: quantity,
}).strict();

catalogRoutes.get("/catalog", async (_req, res) => {
  res.json(await getCatalog(context(res).restaurantId));
});
catalogRoutes.post("/products", async (req, res) => {
  const { operationId, ...data } = newProductSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await createProduct(restaurantId, actorId, data, operationId));
});
catalogRoutes.patch("/products/:id", async (req, res) => {
  const data = editProductSchema.parse(req.body);
  res.json(await editProduct(context(res).restaurantId, String(req.params.id), data));
});
catalogRoutes.get("/products/:id/counts", async (req, res) => {
  res.json(await getStockCounts(context(res).restaurantId, String(req.params.id)));
});
catalogRoutes.post("/products/:id/counts", async (req, res) => {
  const input = stockCountSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await recordStockCount(restaurantId, actorId, String(req.params.id), input));
});
catalogRoutes.post("/products/:id/stock", async (req, res) => {
  const data = stockSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  if (req.get("X-Expected-Restaurant-Id") && req.get("X-Expected-Restaurant-Id") !== restaurantId) { res.status(409).json({ error: { code: "WORKSPACE_CHANGED", message: "Votre établissement a changé. Rechargez la page avant de continuer." } }); return; }
  res.json(await adjustStock(restaurantId, actorId, String(req.params.id), data.delta, data.operationId, data.reason, data.expectedStockRevision, data.expectedUnit));
});
catalogRoutes.get("/products/:id/movements", async (req, res) => {
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
      ...(movement.purchaseReceiptLineId ? { purchaseReceiptLineId: movement.purchaseReceiptLineId } : {}),
    };
  }));
});
