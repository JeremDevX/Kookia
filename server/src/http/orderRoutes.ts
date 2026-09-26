import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { orderDto, validateOrder } from "../application/workspace/orderService.js";
import { getPurchaseSuggestions, recordPurchaseSuggestionDecision } from "../application/workspace/purchaseSuggestionService.js";
import { getPurchaseReceiptLineEvidence, listPurchaseOrders, purchaseReceiptSchema, recordPurchaseReceipt } from "../application/workspace/purchaseReceiptService.js";

export const orderRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const orderSchema = z.object({ operationId: z.uuid(), lines: z.array(z.object({
  productId: z.string().min(1).max(100), quantity: z.number().finite().positive().max(1000000).multipleOf(0.001),
  cartId: z.string().min(1).max(100).optional(),
  predictionId: z.string().min(1).max(100).optional(),
}).strict()).min(1).max(100) }).strict();
const suggestionDecisionSchema = z.object({ operationId: z.uuid(), suggestionKey: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["added", "excluded"]), quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001).optional() })
  .strict().refine((input) => input.decision === "added" ? input.quantity !== undefined : input.quantity === undefined);
orderRoutes.get("/orders/suggestions", async (_req, res, next) => {
  try { res.json(await getPurchaseSuggestions(context(res).restaurantId)); } catch (error) { next(error); }
});
orderRoutes.get("/orders/receipt-lines/:lineId", async (req, res, next) => {
  try {
    const lineId = z.uuid().parse(req.params.lineId);
    res.json(await getPurchaseReceiptLineEvidence(context(res).restaurantId, lineId));
  } catch (error) { next(error); }
});
orderRoutes.post("/orders/suggestions/:productId/decision", async (req, res, next) => {
  try {
    const productId = z.string().trim().min(1).max(100).parse(req.params.productId);
    const input = suggestionDecisionSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await recordPurchaseSuggestionDecision(restaurantId, actorId, { ...input, productId }));
  } catch (error) { next(error); }
});
orderRoutes.get("/orders", async (_req, res, next) => {
  try { res.json(await listPurchaseOrders(context(res).restaurantId)); } catch (error) { next(error); }
});
orderRoutes.post("/orders", async (req, res, next) => {
  try {
    const input = orderSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(orderDto(await validateOrder(restaurantId, actorId, input)));
  } catch (error) { next(error); }
});
orderRoutes.post("/orders/:orderId/receipts", async (req, res, next) => {
  try {
    const orderId = z.string().trim().min(1).max(100).parse(req.params.orderId);
    const input = purchaseReceiptSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(await recordPurchaseReceipt(restaurantId, actorId, orderId, input));
  } catch (error) { next(error); }
});
orderRoutes.get("/decisions", async (_req, res, next) => {
  try {
    const decisions = await prisma.recommendationDecision.findMany({ where: { restaurantId: context(res).restaurantId }, orderBy: { createdAt: "desc" } });
    res.json(decisions.map(({ id, actorId, decision, snapshot, createdAt }) => ({ id, actorId, decision, snapshot, createdAt })));
  } catch (error) { next(error); }
});
