import { cartSchema } from "./cartService.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export interface OrderInput {
  operationId: string;
  lines: { productId: string; quantity: number; predictionId?: string; cartId?: string }[];
}

export async function validateOrder(restaurantId: string, actorId: string, input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.purchaseOrder.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } }, include: { lines: true } });
    if (prior) {
      const decision = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId } });
      const snapshot = decision?.snapshot;
      const previous = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot.input : null;
      if (!Array.isArray(previous) || previous.length !== input.lines.length || !previous.every((line, index) => {
        if (!line || typeof line !== "object" || Array.isArray(line)) return false;
        const current = input.lines[index];
        return line.productId === current.productId && line.quantity === current.quantity && (line.predictionId ?? null) === (current.predictionId ?? null) && (line.cartId ?? null) === (current.cartId ?? null);
      })) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée avec une autre commande.");
      return prior;
    }
    const cart = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: "cart" } } });
    const cartItems = cartSchema.parse(cart?.data ?? []);
    for (const line of input.lines) {
      if (line.cartId && !cartItems.some((item) => item.id === line.cartId && item.productId === line.productId && (item.predictionId ?? null) === (line.predictionId ?? null))) {
        throw new WorkspaceError(409, "CART_CHANGED", "La sélection a changé. Rechargez votre panier avant de valider.");
      }
    }
    const lines = [];
    const suggestions = [];
    for (const line of input.lines) {
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: line.productId } }, include: { supplier: true } });
      if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit de la commande est introuvable.");
      if (line.predictionId) {
        const prediction = await tx.prediction.findUnique({ where: { restaurantId_id: { restaurantId, id: line.predictionId } } });
        if (!prediction || prediction.productId !== product.id || prediction.action !== "buy") throw new WorkspaceError(400, "INVALID_PREDICTION", "La suggestion ne correspond pas au produit commandé.");
        suggestions.push({ id: prediction.id, productId: prediction.productId, action: prediction.action, quantity: Number(prediction.quantity), reason: prediction.reason, confidence: prediction.confidence, predictedDate: prediction.predictedDate.toISOString() });
      }
      lines.push({ productId: product.id, productName: product.name, supplierId: product.supplierId,
        supplierName: product.supplier.name, unit: product.unit, quantity: line.quantity, pricePerUnit: product.pricePerUnit });
    }
    const order = await tx.purchaseOrder.create({ data: { restaurantId, actorId, operationId: input.operationId, lines: { create: lines } }, include: { lines: true } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "order_validated", snapshot: { input: input.lines, suggestions, orderId: order.id } } });
    if (cart) {
      const ids = input.lines.flatMap((line) => line.cartId ? [line.cartId] : []);
      await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId, kind: "cart" } },
        data: { data: cartItems.filter((item) => !ids.includes(item.id)), revision: { increment: 1 } } });
    }
    return order;
  });
}

export const orderDto = (order: Awaited<ReturnType<typeof validateOrder>>) => ({
  id: order.id, status: order.status, createdAt: order.createdAt.toISOString(),
  lines: order.lines.map(({ productId, productName, supplierName, quantity, unit, pricePerUnit }) => ({
    productId, productName, supplierName, quantity: Number(quantity), unit, pricePerUnit: Number(pricePerUnit),
  })),
});
