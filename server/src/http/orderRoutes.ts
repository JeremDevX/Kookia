import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { orderDto, validateOrder } from "../application/workspace/orderService.js";

export const orderRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const orderSchema = z.object({ operationId: z.uuid(), lines: z.array(z.object({
  productId: z.string().min(1).max(100), quantity: z.number().finite().positive().max(1000000).multipleOf(0.001),
  predictionId: z.string().min(1).max(100).optional(),
}).strict()).min(1).max(100) }).strict();
orderRoutes.get("/orders", async (_req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({ where: { restaurantId: context(res).restaurantId }, include: { lines: true }, orderBy: { createdAt: "desc" } });
    res.json(orders.map(orderDto));
  } catch (error) { next(error); }
});
orderRoutes.post("/orders", async (req, res, next) => {
  try {
    const input = orderSchema.parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.status(201).json(orderDto(await validateOrder(restaurantId, actorId, input)));
  } catch (error) { next(error); }
});
orderRoutes.get("/decisions", async (_req, res, next) => {
  try {
    const decisions = await prisma.recommendationDecision.findMany({ where: { restaurantId: context(res).restaurantId }, orderBy: { createdAt: "desc" } });
    res.json(decisions.map(({ id, actorId, decision, snapshot, createdAt }) => ({ id, actorId, decision, snapshot, createdAt })));
  } catch (error) { next(error); }
});
