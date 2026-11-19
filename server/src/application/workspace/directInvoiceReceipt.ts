import type { Prisma } from "@prisma/client";
import type { ReceivedIngredient } from "../../../../shared/ingredientOutflowEstimate.js";
import { invoiceSchema } from "./invoiceData.js";
import { simulationActor } from "./operationProvenance.js";

const movementSelect = {
  id: true, operationId: true, delta: true, invoiceDocumentId: true, invoiceRevision: true,
  productId: true, productNameSnapshot: true, productUnitSnapshot: true,
  product: { select: { name: true, unit: true } },
} satisfies Prisma.StockMovementSelect;
type InvoiceMovement = Prisma.StockMovementGetPayload<{ select: typeof movementSelect }>;

function directMovementWhere(restaurantId: string) {
  return { restaurantId, restaurant: { mode: "operational" }, reason: "receipt", actorId: { not: simulationActor },
    delta: { gt: 0 }, purchaseReceiptLineId: null, sourceDocumentId: null } satisfies Prisma.StockMovementWhereInput;
}

function recordedInvoice(document: { kind: string; data: Prisma.JsonValue; revision: number }) {
  const invoice = invoiceSchema.safeParse(document.data);
  if (!invoice.success) return null;
  const { id, date, reference, source, status, stockEffect, provenance, sourceDocumentId, lines } = invoice.data;
  if (document.kind !== `invoice:${id}` || !date || source !== "manual" || status !== "received" ||
      (stockEffect !== undefined && stockEffect !== "recorded") || provenance || sourceDocumentId) return null;
  return { id, date, reference, lines, revision: document.revision };
}

function receiptFromMovement(movement: InvoiceMovement, invoice: NonNullable<ReturnType<typeof recordedInvoice>>): ReceivedIngredient | null {
  if ((movement.invoiceDocumentId !== null && movement.invoiceDocumentId !== invoice.id) ||
      (movement.invoiceRevision !== null && movement.invoiceRevision !== invoice.revision)) return null;
  const line = invoice.lines.find((entry) => entry.productId === movement.productId && movement.delta.equals(entry.quantity));
  if (!line) return null;
  // Product units are immutable. Older invoices and movements did not store a unit.
  return { id: movement.id, stockMovementId: movement.id, receiptId: invoice.id, receiptReference: invoice.reference,
    deliveryDate: invoice.date, productId: movement.productId, productName: movement.productNameSnapshot ?? movement.product.name,
    unit: movement.productUnitSnapshot || line.unit || movement.product.unit, receivedQuantity: Number(movement.delta) };
}

export async function listDirectInvoiceReceiptLines(db: Prisma.TransactionClient, restaurantId: string, from: string, to: string) {
  const documents = await db.workspaceDocument.findMany({ where: {
    restaurantId, kind: { startsWith: "invoice:" },
    data: { path: ["date"], gte: from, lte: to },
  }, select: { kind: true, data: true, revision: true } });
  const invoices = new Map(documents.flatMap((document) => {
    const invoice = recordedInvoice(document);
    return invoice ? [[document.kind, invoice] as const] : [];
  }));
  if (!invoices.size) return [];
  const movements = await db.stockMovement.findMany({ where: {
    ...directMovementWhere(restaurantId), operationId: { in: [...invoices.keys()] },
  }, select: movementSelect });
  return movements.flatMap((movement) => {
    const invoice = invoices.get(movement.operationId);
    const receipt = invoice && receiptFromMovement(movement, invoice);
    return receipt ? [receipt] : [];
  });
}

export async function findDirectInvoiceReceiptLine(db: Prisma.TransactionClient, restaurantId: string, lineId: string) {
  const movement = await db.stockMovement.findFirst({ where: {
    ...directMovementWhere(restaurantId), id: lineId, operationId: { startsWith: "invoice:" },
  }, select: movementSelect });
  if (!movement) return null;
  const document = await db.workspaceDocument.findUnique({ where: {
    restaurantId_kind: { restaurantId, kind: movement.operationId },
  }, select: { kind: true, data: true, revision: true } });
  const invoice = document && recordedInvoice(document);
  const receipt = invoice && receiptFromMovement(movement, invoice);
  return receipt ? { receipt, currentUnit: movement.product.unit } : null;
}
