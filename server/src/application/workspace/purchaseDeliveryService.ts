import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export const purchaseDeliverySchema = z.object({ operationId: z.uuid(), expectedRevision: z.number().int().nonnegative(),
  expectedDeliveryDate: z.iso.date().nullable(), note: z.string().trim().min(1).max(500) }).strict();

export async function updatePurchaseDelivery(restaurantId: string, actorId: string, lineId: string,
  input: z.infer<typeof purchaseDeliverySchema>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId } });
    const snapshot = { lineId, ...input };
    if (prior) {
      const saved = prior.snapshot;
      if (prior.decision !== "purchase_delivery_updated" || !saved || typeof saved !== "object" || Array.isArray(saved) ||
          saved.lineId !== lineId || saved.expectedRevision !== input.expectedRevision || saved.expectedDeliveryDate !== input.expectedDeliveryDate || saved.note !== input.note)
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération correspond déjà à un autre report.");
      return { replayed: true };
    }
    const line = await tx.purchaseOrderLine.findUnique({ where: { restaurantId_id: { restaurantId, id: lineId } }, include: { order: true, receiptLines: { select: { receivedQuantity: true } } } });
    if (!line) throw new WorkspaceError(404, "NOT_FOUND", "Ligne de commande introuvable.");
    if (!["validated", "partially_received"].includes(line.order.status) ||
        line.receiptLines.reduce((total, receipt) => total + Number(receipt.receivedQuantity), 0) >= Number(line.quantity))
      throw new WorkspaceError(409, "ORDER_NOT_PENDING", "Seule une commande en attente peut être reportée.");
    const updated = await tx.purchaseOrderLine.updateMany({ where: { restaurantId, id: lineId, deliveryRevision: input.expectedRevision },
      data: { expectedDeliveryDate: input.expectedDeliveryDate ? new Date(`${input.expectedDeliveryDate}T00:00:00Z`) : null,
        deliveryNote: input.note, deliveryRevision: { increment: 1 } } });
    if (!updated.count) throw new WorkspaceError(409, "DELIVERY_CHANGED", "La livraison a changé. Rechargez la commande.");
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "purchase_delivery_updated", snapshot } });
    return { replayed: false };
  });
}
