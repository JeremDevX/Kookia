import type { Prisma } from "@prisma/client";
import type { ReceivedIngredient } from "../../../../shared/ingredientOutflowEstimate.js";
import type { PurchaseReceiptLineEvidence } from "../../../../shared/purchaseReceipt.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { findDirectInvoiceReceiptLine } from "./directInvoiceReceipt.js";
import { WorkspaceError } from "./workspaceError.js";

export async function getRecordedReceiptLine(db: Prisma.TransactionClient, restaurantId: string, lineId: string): Promise<ReceivedIngredient> {
  const line = await db.purchaseReceiptLine.findFirst({ where: { restaurantId, id: lineId }, include: {
    receipt: { select: { id: true, deliveryReference: true, deliveryDate: true, simulated: true, provenance: true } },
    product: { select: { unit: true } },
  } });
  if (!line) {
    const direct = await findDirectInvoiceReceiptLine(db, restaurantId, lineId);
    if (!direct) throw new WorkspaceError(404, "RECEIPT_LINE_NOT_FOUND", "Ligne de réception introuvable dans cet espace.");
    assertProductUnit(direct.receipt.unit, direct.currentUnit);
    return direct.receipt;
  }
  if (line.receipt.simulated || line.receipt.provenance !== "recorded")
    throw new WorkspaceError(409, "SIMULATED_RECEIPT_NOT_ELIGIBLE", "Cette réception ne peut pas fonder une proposition opérationnelle.");
  if (!line.receivedQuantity.greaterThan(0))
    throw new WorkspaceError(409, "EMPTY_RECEIPT_LINE", "La ligne de réception ne contient aucune quantité positive.");
  assertProductUnit(line.unit, line.product.unit);
  return { id: line.id, receiptId: line.receipt.id, receiptReference: line.receipt.deliveryReference,
    deliveryDate: line.receipt.deliveryDate.toISOString().slice(0, 10),
    productId: line.productId, productName: line.productName, unit: line.unit, receivedQuantity: Number(line.receivedQuantity) };
}

function assertProductUnit(receiptUnit: string, currentUnit: string) {
  if (receiptUnit !== currentUnit)
    throw new WorkspaceError(409, "RECEIPT_PRODUCT_UNIT_CHANGED", "L’unité du produit ne correspond plus à celle de la réception.");
}

export async function getPurchaseReceiptLineEvidence(restaurantId: string, lineId: string): Promise<PurchaseReceiptLineEvidence> {
  const { id, stockMovementId, receiptReference, deliveryDate, productId, productName, unit, receivedQuantity } =
    await getRecordedReceiptLine(prisma, restaurantId, lineId);
  return { receiptLineId: id, deliveryReference: receiptReference, deliveryDate, productId, productName, unit, receivedQuantity,
    ...(stockMovementId ? { stockMovementId } : {}) };
}
