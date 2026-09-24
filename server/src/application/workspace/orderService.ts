import { cartSchema } from "./cartService.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { getPurchaseSuggestions } from "./purchaseSuggestionService.js";

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
    const suggestionDecisions: Array<{ id: string; operationId: string; snapshot: Prisma.JsonObject }> = [];
    const suggestionDecisionByCartId = new Map<string, string>();
    for (const line of input.lines) {
      const cartItem = line.cartId ? cartItems.find((item) => item.id === line.cartId) : undefined;
      if (line.cartId && (!cartItem || cartItem.productId !== line.productId || (cartItem.predictionId ?? null) !== (line.predictionId ?? null))) {
        throw new WorkspaceError(409, "CART_CHANGED", "La sélection a changé. Rechargez votre panier avant de valider.");
      }
      if (cartItem?.purchaseSuggestionOperationId) {
      const decision = await tx.recommendationDecision.findFirst({ where: { restaurantId,
        operationId: cartItem.purchaseSuggestionOperationId, decision: "purchase_suggestion_added" } });
        const rawSnapshot = decision?.snapshot;
        const snapshot = rawSnapshot && typeof rawSnapshot === "object" && !Array.isArray(rawSnapshot)
          ? rawSnapshot as Prisma.JsonObject : null;
        if (!decision || !snapshot) {
          throw new WorkspaceError(409, "SUGGESTION_DECISION_REQUIRED", "La proposition d’achat doit être revue à nouveau.");
        }
        if (snapshot.productId !== line.productId || snapshot.quantity !== cartItem.quantity) {
          throw new WorkspaceError(409, "SUGGESTION_DECISION_REQUIRED", "La proposition d’achat doit être revue à nouveau.");
        }
        suggestionDecisions.push({ id: decision.id, operationId: decision.operationId, snapshot });
        suggestionDecisionByCartId.set(cartItem.id, decision.id);
      }
    }
    const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
    if (!restaurant) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
    if (suggestionDecisions.length) {
      if (new Set(suggestionDecisions.map(({ id }) => id)).size !== suggestionDecisions.length)
        throw new WorkspaceError(409, "SUGGESTION_ALREADY_ORDERED", "Une même proposition ne peut apparaître qu’une fois dans une commande.");
      const currentSuggestions = await getPurchaseSuggestions(restaurantId, tx);
      for (const { snapshot } of suggestionDecisions) {
        if (snapshot.workspaceMode !== currentSuggestions.workspaceMode ||
            typeof snapshot.suggestionKey !== "string" || !currentSuggestions.suggestions.some((suggestion) =>
              suggestion.suggestionKey === snapshot.suggestionKey && suggestion.canAdd)) {
          throw new WorkspaceError(409, "SUGGESTION_CHANGED", "Le besoin ou le stock a changé depuis la revue. Rechargez la proposition.");
        }
      }
      if (await tx.purchaseOrderLine.findFirst({ where: { suggestionDecisionId: { in: suggestionDecisions.map(({ id }) => id) } },
        select: { id: true } })) throw new WorkspaceError(409, "SUGGESTION_ALREADY_ORDERED", "Cette proposition est déjà associée à une commande enregistrée.");
    }
    const lines = [];
    for (const line of input.lines) {
      if (line.predictionId) throw new WorkspaceError(400, "DEMO_PREDICTION", "Les scénarios d'exemple ne peuvent pas être validés dans une commande.");
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: line.productId } }, include: { supplier: true } });
      if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit de la commande est introuvable.");
      lines.push({ productId: product.id, productName: product.name, supplierId: product.supplierId,
        supplierName: product.supplier.name, unit: product.unit, quantity: line.quantity, pricePerUnit: product.pricePerUnit,
        ...(line.cartId && suggestionDecisionByCartId.has(line.cartId)
          ? { suggestionDecisionId: suggestionDecisionByCartId.get(line.cartId)! } : {}) });
    }
    const simulated = restaurant.mode === "demo";
    const order = await tx.purchaseOrder.create({ data: { restaurantId, actorId, operationId: input.operationId,
      status: simulated ? "simulated" : "validated", lines: { create: lines } }, include: { lines: true } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: simulated ? "order_simulated_validated" : "order_validated",
      snapshot: { input: input.lines, suggestions: suggestionDecisions.map(({ id, operationId, snapshot }) => ({ id, operationId, snapshot })),
        orderId: order.id, workspaceMode: restaurant.mode } } });
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
  lines: order.lines.map(({ id, productId, productName, supplierId, supplierName, quantity, unit, pricePerUnit }) => ({
    id, productId, productName, supplierId, supplierName, quantity: Number(quantity), receivedQuantity: 0,
    remainingQuantity: Number(quantity), unit, pricePerUnit: Number(pricePerUnit),
  })),
  receipts: [],
});
