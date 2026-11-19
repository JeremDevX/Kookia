import { purchaseCreditSchema, recordPurchaseCredit, getPurchaseReconciliation } from "../application/workspace/purchaseReconciliationService.js";
import { purchaseDeliverySchema, updatePurchaseDelivery } from "../application/workspace/purchaseDeliveryService.js";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { getOrderReceiptInvoices } from "../application/workspace/invoiceReadService.js";
import { validateOrder } from "../application/workspace/orderService.js";
import { getPurchaseSuggestions, recordPurchaseSuggestionDecision } from "../application/workspace/purchaseSuggestionService.js";
import { getPurchaseReceiptLineEvidence, recordPurchaseReceipt } from "../application/workspace/purchaseReceiptService.js";
import { listPlanningOrders, listPurchaseOrderHistory, listPurchaseOrders } from "../application/workspace/purchaseOrderReadService.js";
import { purchaseReceiptSchema } from "../../../shared/purchaseReceipt.js";
import { refreshForecastWeather } from "../application/workspace/forecastWeatherService.js";
import { formatParisDate } from "../../../shared/parisDate.js";
import type { WeatherProvider } from "../integrations/weatherProvider.js";
import { rejectChangedWorkspace, workspaceContext as context } from "./workspaceContext.js";

export const orderRoutes = Router();
const orderSchema = z.object({ operationId: z.uuid(), lines: z.array(z.object({
  productId: z.string().min(1).max(100), quantity: z.number().finite().positive().max(1000000).multipleOf(0.001),
  cartId: z.string().min(1).max(100).optional(),
  predictionId: z.string().min(1).max(100).optional(),
}).strict()).min(1).max(100) }).strict();
const suggestionDecisionSchema = z.object({ operationId: z.uuid(), suggestionKey: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["added", "excluded"]), quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001).optional() })
  .strict().refine((input) => input.decision === "added" ? input.quantity !== undefined : input.quantity === undefined);
const orderListQuery = z.discriminatedUnion("view", [
  z.object({ view: z.literal("history"), page: z.string().regex(/^\d{1,9}$/).transform(Number).default(0),
    query: z.string().trim().max(200).optional(), supplierId: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["all", "pending", "received"]).optional(),
    orderId: z.string().min(1).max(100).optional(), receiptId: z.string().min(1).max(100).optional() }).strict(),
  z.object({ view: z.literal("planning"), date: z.iso.date() }).strict(),
  z.object({ view: z.literal("pending") }).strict(),
]);
orderRoutes.get("/orders/suggestions", async (_req, res) => {
  await refreshForecastWeather(context(res).restaurantId, formatParisDate(), res.locals.weatherProvider as WeatherProvider);
  res.json(await getPurchaseSuggestions(context(res).restaurantId));
});
orderRoutes.get("/orders/:orderId/receipt-invoices", async (req, res) => {
  const orderId = z.string().trim().min(1).max(100).parse(req.params.orderId);
  res.json(await getOrderReceiptInvoices(context(res).restaurantId, orderId));
});
orderRoutes.get("/orders/receipt-lines/:lineId", async (req, res) => {
  const lineId = z.uuid().parse(req.params.lineId);
  res.json(await getPurchaseReceiptLineEvidence(context(res).restaurantId, lineId));
});
orderRoutes.post("/orders/suggestions/:productId/decision", async (req, res) => {
  const productId = z.string().trim().min(1).max(100).parse(req.params.productId);
  const input = suggestionDecisionSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await recordPurchaseSuggestionDecision(restaurantId, actorId, { ...input, productId }));
});
orderRoutes.get("/orders", async (req, res) => {
  const { restaurantId } = context(res);
  if (Object.keys(req.query).length === 0) {
    res.json(await listPurchaseOrders(restaurantId));
    return;
  }
  const input = orderListQuery.parse(req.query);
  if (input.view === "history") res.json(await listPurchaseOrderHistory(restaurantId, input));
  else if (input.view === "planning") res.json(await listPlanningOrders(restaurantId, input.date));
  else res.json(await listPurchaseOrders(restaurantId, true));
});
orderRoutes.post("/orders", async (req, res) => {
  const input = orderSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await validateOrder(restaurantId, actorId, input));
});
orderRoutes.post("/orders/:orderId/receipts", async (req, res) => {
  const orderId = z.string().trim().min(1).max(100).parse(req.params.orderId);
  const input = purchaseReceiptSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await recordPurchaseReceipt(restaurantId, actorId, orderId, input));
});
orderRoutes.patch("/orders/lines/:lineId/delivery", async (req, res) => {
  const lineId = z.uuid().parse(req.params.lineId);
  const input = purchaseDeliverySchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  res.json(await updatePurchaseDelivery(restaurantId, actorId, lineId, input));
});
orderRoutes.get("/orders/:orderId/reconciliation", async (req, res) => {
  if (rejectChangedWorkspace(req, res)) return;
  res.json(await getPurchaseReconciliation(context(res).restaurantId, z.uuid().parse(req.params.orderId)));
});
orderRoutes.post("/orders/credits", async (req, res) => {
  if (rejectChangedWorkspace(req, res)) return;
  const { restaurantId, actorId } = context(res);
  res.status(201).json(await recordPurchaseCredit(restaurantId, actorId, purchaseCreditSchema.parse(req.body)));
});
orderRoutes.get("/decisions", async (_req, res) => {
  const decisions = await prisma.recommendationDecision.findMany({ where: { restaurantId: context(res).restaurantId }, orderBy: { createdAt: "desc" } });
  res.json(decisions.map(({ id, actorId, decision, snapshot, createdAt }) => ({ id, actorId, decision, snapshot, createdAt })));
});
