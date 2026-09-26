import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export const purchaseCreditSchema = z.object({ operationId: z.uuid(), receiptId: z.uuid(),
  reference: z.string().trim().min(1).max(120), amount: z.number().finite().positive().max(1_000_000).multipleOf(0.01),
  reason: z.string().trim().min(1).max(500) }).strict();

export async function recordPurchaseCredit(restaurantId: string, actorId: string, input: z.infer<typeof purchaseCreditSchema>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.purchaseCredit.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    if (prior) {
      if (prior.receiptId !== input.receiptId || prior.reference !== input.reference || Number(prior.amount) !== input.amount || prior.reason !== input.reason)
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cet enregistrement correspond déjà à un autre avoir.");
      return { id: prior.id, replayed: true };
    }
    const receipt = await tx.purchaseReceipt.findUnique({ where: { restaurantId_id: { restaurantId, id: input.receiptId } } });
    if (!receipt || receipt.simulated) throw new WorkspaceError(404, "RECEIPT_NOT_FOUND", "Réception réelle introuvable dans votre espace.");
    if (await tx.purchaseCredit.findFirst({ where: { restaurantId, receiptId: input.receiptId, reference: input.reference } }))
      throw new WorkspaceError(409, "CREDIT_ALREADY_RECORDED", "Cet avoir est déjà lié à cette réception.");
    const credit = await tx.purchaseCredit.create({ data: { restaurantId, actorId, ...input } });
    return { id: credit.id, replayed: false };
  });
}

export async function getPurchaseReconciliation(restaurantId: string, orderId: string) {
  const order = await prisma.purchaseOrder.findUnique({ where: { restaurantId_id: { restaurantId, id: orderId } },
    include: { receipts: { include: { credits: true } } } });
  if (!order) throw new WorkspaceError(404, "NOT_FOUND", "Commande introuvable.");
  return { orderId, receipts: order.receipts.map((receipt) => ({ receiptId: receipt.id,
    deliveryReference: receipt.deliveryReference, deliveryDate: receipt.deliveryDate.toISOString().slice(0, 10),
    invoiceDocumentId: receipt.invoiceDocumentId, invoiceReference: receipt.invoiceReference,
    invoiceComplete: receipt.invoiceComplete, simulated: receipt.simulated,
    credits: receipt.credits.map((credit) => ({ id: credit.id, reference: credit.reference, amount: Number(credit.amount), reason: credit.reason })),
  })), assumptions: ["Un avoir est une pièce financière rapprochée, pas une sortie de stock ni une perte.",
    "Le montant de l’avoir ne modifie pas silencieusement les KPI historiques ni les prix de commande."] };
}
