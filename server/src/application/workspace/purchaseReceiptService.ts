import { checkInvoiceDuplicates, invoiceKey } from "./invoiceDuplicates.js";
import { formatParisDate } from "../../../../shared/parisDate.js";
import { invoiceSchema, recordSourceInvoiceRevision } from "./invoiceData.js";
import { creditReceiptStock, getReceiptProduct, lockReceiptProducts, lockReceiptWorkspace } from "./receiptStock.js";
import { isDeepStrictEqual } from "node:util";
import { Prisma, type PurchaseReceipt as PurchaseReceiptRecord, type PurchaseReceiptLine as PurchaseReceiptLineRecord,
  type PrismaClient } from "@prisma/client";
import type { PurchaseReceiptInput, PurchaseReceiptLineEvidence } from "../../../../shared/purchaseReceipt.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { rejectPriorSourceCredit, sourceInvoiceDocumentSchema, validateSourceReview } from "./invoiceService.js";

type ReceiptDatabase = PrismaClient | Prisma.TransactionClient;
type ReceiptLineWithMovement = PurchaseReceiptLineRecord & { movement: { id: string } | null };
type ReceiptWithLines = PurchaseReceiptRecord & { lines: ReceiptLineWithMovement[] };
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function purchaseReceiptDto(receipt: ReceiptWithLines) {
  return { id: receipt.id, orderId: receipt.orderId, supplierId: receipt.supplierId,
    invoiceReference: receipt.invoiceReference, invoiceDocumentId: receipt.invoiceDocumentId,
    invoiceDocumentRevision: receipt.invoiceDocumentRevision, deliveryReference: receipt.deliveryReference,
    deliveryDate: receipt.deliveryDate.toISOString().slice(0, 10), simulated: receipt.simulated,
    provenance: receipt.provenance, invoiceComplete: receipt.invoiceComplete, createdAt: receipt.createdAt.toISOString(),
    lines: receipt.lines.map((line) => ({ id: line.id, orderLineId: line.orderLineId, productId: line.productId,
      productName: line.productName, invoiceLineIndex: line.invoiceLineIndex, invoiceQuantity: Number(line.invoiceQuantity),
      receivedQuantity: Number(line.receivedQuantity), quantityDifference: Number(line.quantityDifference), unit: line.unit,
      stockMovementId: line.movement?.id ?? null,
      orderedQuantity: Number(line.orderedQuantity), orderedUnitPrice: Number(line.orderedUnitPrice),
      invoiceUnitPrice: Number(line.invoiceUnitPrice),
      ...(line.priceDifferenceReason ? { priceDifferenceReason: line.priceDifferenceReason } : {}) })),
  };
}

function sameSnapshot(left: Prisma.JsonValue, right: PurchaseReceiptInput) {
  return isDeepStrictEqual(left, right);
}

export async function recordPurchaseReceipt(restaurantId: string, actorId: string, orderId: string,
  input: PurchaseReceiptInput) {
  return prisma.$transaction(async (tx) => {
    const mode = await lockReceiptWorkspace(tx, restaurantId);
    const prior = await tx.purchaseReceipt.findUnique({ where: { restaurantId_operationId: {
      restaurantId, operationId: input.operationId,
    } }, include: { lines: { include: { movement: { select: { id: true } } } } } });
    if (prior) {
      if (prior.orderId !== orderId || !sameSnapshot(prior.requestSnapshot, input))
        throw new WorkspaceError(409, "RECEIPT_OPERATION_CONFLICT", "Cette opération de réception a déjà été utilisée avec d’autres valeurs.");
      return { ...purchaseReceiptDto(prior), replayed: true };
    }

    if (input.deliveryDate > formatParisDate()) throw new WorkspaceError(400, "FUTURE_DELIVERY_DATE", "La date de livraison ne peut pas être future.");
    const [invoiceDocument, order] = await Promise.all([
      tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: `invoice:${input.invoiceDocumentId}` } } }),
      tx.purchaseOrder.findFirst({ where: { restaurantId, id: orderId }, include: { lines: true } }),
    ]);
    if (!invoiceDocument) throw new WorkspaceError(404, "INVOICE_NOT_FOUND", "Facture brouillon introuvable dans cet espace.");
    if (invoiceDocument.revision !== input.invoiceDocumentRevision)
      throw new WorkspaceError(409, "INVOICE_REVISION_CONFLICT", "La facture a changé. Rechargez-la avant le rapprochement.");
    const invoice = invoiceSchema.parse(invoiceDocument.data);
    if (invoice.status !== "draft") throw new WorkspaceError(409, "INVOICE_ALREADY_RECEIVED", "Cette facture est déjà réceptionnée.");
    if (!invoice.reference.trim() || !invoice.date || !invoice.supplierId)
      throw new WorkspaceError(409, "INVOICE_REVIEW_REQUIRED", "Enregistrez la référence, la date et le fournisseur de la facture avant rapprochement.");
    if (invoice.source === "manual") await checkInvoiceDuplicates(tx, restaurantId, invoice.id, invoice.supplierId, invoice.reference, input.confirmedDuplicates);
    if (invoice.source === "demo" && mode !== "demo")
      throw new WorkspaceError(409, "DEMO_INVOICE_IN_OPERATIONAL_WORKSPACE", "Une facture d’exemple ne peut pas être utilisée dans un espace réel.");
    if (invoice.source === "source_document" && mode !== "demo")
      throw new WorkspaceError(409, "SIMULATION_IN_OPERATIONAL_WORKSPACE", "Une pièce de démonstration ne peut pas créditer une commande réelle.");
    if (invoice.source === "source_document") {
      if (!invoice.sourceDocumentId) throw new WorkspaceError(409, "SOURCE_ID_REQUIRED", "La pièce d’origine n’est plus liée à la facture.");
      const sourceDocument = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: {
        restaurantId, kind: `source-invoice:${invoice.sourceDocumentId}`,
      } } });
      if (!sourceDocument) throw new WorkspaceError(404, "SOURCE_NOT_FOUND", "Pièce d’origine introuvable.");
      const source = sourceInvoiceDocumentSchema.parse(sourceDocument.data);
      if (invoice.sourceContentHash !== source.contentHash || invoice.sourceDocumentRevision !== sourceDocument.revision)
        throw new WorkspaceError(409, "SOURCE_CHANGED", "La pièce d’origine a changé depuis la revue de cette facture.");
      validateSourceReview(source, invoice);
      await rejectPriorSourceCredit(tx, restaurantId, invoice.sourceDocumentId);
    }
    if (!order) throw new WorkspaceError(404, "ORDER_NOT_FOUND", "Commande introuvable dans cet espace.");
    const simulated = mode === "demo";
    if (simulated !== order.status.startsWith("simulated"))
      throw new WorkspaceError(409, "ORDER_MODE_MISMATCH", "Le statut de cette commande ne correspond pas au mode de l’espace.");
    if (["received", "simulated_received"].includes(order.status))
      throw new WorkspaceError(409, "ORDER_ALREADY_RECEIVED", "Cette commande est déjà entièrement réceptionnée.");
    if (!input.deliveryReference.trim()) throw new WorkspaceError(400, "DELIVERY_REFERENCE_REQUIRED", "Indiquez une référence de livraison.");
    if (input.lines.length === 0) throw new WorkspaceError(400, "NO_RECEIPT_LINES", "Sélectionnez au moins une ligne à rapprocher.");

    const includedInvoiceLines = invoice.lines.flatMap((line, index) => invoice.source === "source_document"
      ? line.disposition === "stock" ? [{ line, index }] : []
      : [{ line, index }]);
    const submittedIndices = input.lines.map((line) => line.invoiceLineIndex);
    if (new Set(submittedIndices).size !== submittedIndices.length || new Set(input.lines.map((line) => line.orderLineId)).size !== input.lines.length)
      throw new WorkspaceError(400, "DUPLICATE_RECEIPT_LINE", "Chaque ligne de facture et de commande ne peut être rapprochée qu’une fois par livraison.");
    if (includedInvoiceLines.length !== input.lines.length || includedInvoiceLines.some(({ index }) => !submittedIndices.includes(index)))
      throw new WorkspaceError(409, "INVOICE_LINES_UNMATCHED", "Chaque ligne de facture incluse doit être rapprochée à une ligne de commande ou explicitement écartée.");

    const orderLineById = new Map(order.lines.map((line) => [line.id, line]));
    const orderLineIds = order.lines.map((line) => line.id);
    const [priorOrderLines, priorInvoiceReceipts, supplier] = await Promise.all([
      tx.purchaseReceiptLine.findMany({ where: { restaurantId, orderLineId: { in: orderLineIds } },
        select: { orderLineId: true, receivedQuantity: true } }),
      tx.purchaseReceipt.findMany({ where: { restaurantId, invoiceDocumentId: input.invoiceDocumentId },
        include: { lines: { select: { invoiceLineIndex: true, receivedQuantity: true } } } }),
      tx.supplier.findUnique({ where: { restaurantId_id: { restaurantId, id: invoice.supplierId } }, select: { id: true, name: true } }),
    ]);
    if (!supplier) throw new WorkspaceError(400, "INVALID_SUPPLIER", "Le fournisseur de la facture est absent de votre espace.");
    const receivedByOrderLine = new Map<string, Prisma.Decimal>();
    for (const line of priorOrderLines) receivedByOrderLine.set(line.orderLineId,
      (receivedByOrderLine.get(line.orderLineId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
    const receivedByInvoiceLine = new Map<number, Prisma.Decimal>();
    for (const receipt of priorInvoiceReceipts) for (const line of receipt.lines)
      receivedByInvoiceLine.set(line.invoiceLineIndex,
        (receivedByInvoiceLine.get(line.invoiceLineIndex) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));

    const validated = input.lines.map((entry) => {
      const invoiceLine = invoice.lines[entry.invoiceLineIndex];
      const orderLine = orderLineById.get(entry.orderLineId);
      if (!invoiceLine || !orderLine || invoiceLine.productId !== orderLine.productId || invoice.supplierId !== orderLine.supplierId)
        throw new WorkspaceError(409, "RECEIPT_LINE_MISMATCH", "Le produit, le fournisseur ou la commande ne correspond pas à la facture.");
      if (!invoiceLine.unit || invoiceLine.unit !== orderLine.unit)
        throw new WorkspaceError(409, "UNIT_MISMATCH", "L’unité de la facture ne correspond pas à celle de la commande.");
      const invoiceQuantity = new Prisma.Decimal(invoiceLine.quantity);
      const receivedQuantity = new Prisma.Decimal(entry.receivedQuantity);
      const priorInvoiceReceived = receivedByInvoiceLine.get(entry.invoiceLineIndex) ?? new Prisma.Decimal(0);
      const priorOrderReceived = receivedByOrderLine.get(orderLine.id) ?? new Prisma.Decimal(0);
      const outstanding = new Prisma.Decimal(orderLine.quantity).minus(priorOrderReceived);
      if (!invoiceQuantity.greaterThan(0) || invoiceQuantity.greaterThan(orderLine.quantity) ||
          priorInvoiceReceived.plus(receivedQuantity).greaterThan(invoiceQuantity) || receivedQuantity.greaterThan(outstanding))
        throw new WorkspaceError(409, "RECEIPT_QUANTITY_EXCEEDED", "La quantité livrée dépasse la facture ou le reliquat de commande.");
      const invoiceUnitPrice = new Prisma.Decimal(invoiceLine.unitPrice);
      const priceDiffers = !invoiceUnitPrice.equals(orderLine.pricePerUnit);
      const priceDifferenceReason = entry.priceDifferenceReason?.trim();
      if (priceDiffers && !priceDifferenceReason)
        throw new WorkspaceError(409, "PRICE_DIFFERENCE_REVIEW_REQUIRED", "Expliquez l’écart entre le prix de la commande et celui de la facture avant crédit.");
      return { entry, invoiceLine, orderLine, invoiceQuantity, receivedQuantity, invoiceUnitPrice,
        quantityDifference: invoiceQuantity.minus(receivedQuantity), priceDifferenceReason };
    });
    if (!validated.some((line) => line.receivedQuantity.greaterThan(0)))
      throw new WorkspaceError(409, "NO_RECEIVED_QUANTITY", "Aucune quantité n’a été confirmée comme livrée.");

    if (!simulated) await lockReceiptProducts(tx, restaurantId, validated.flatMap((line) =>
      line.receivedQuantity.greaterThan(0) ? [line.orderLine.productId] : []));

    const priorReceiptKey = await tx.purchaseReceipt.findFirst({ where: { restaurantId, supplierId: supplier.id,
      invoiceReferenceNormalized: invoiceKey(invoice.reference), deliveryReference: input.deliveryReference.trim() }, select: { id: true } });
    if (priorReceiptKey) throw new WorkspaceError(409, "DUPLICATE_INVOICE_DELIVERY", "Cette facture et cette livraison ont déjà été rapprochées.");

    const newReceivedByInvoiceLine = new Map(receivedByInvoiceLine);
    const newReceivedByOrderLine = new Map(receivedByOrderLine);
    for (const line of validated) {
      newReceivedByInvoiceLine.set(line.entry.invoiceLineIndex,
        (newReceivedByInvoiceLine.get(line.entry.invoiceLineIndex) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
      newReceivedByOrderLine.set(line.orderLine.id,
        (newReceivedByOrderLine.get(line.orderLine.id) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
    }
    const invoiceComplete = includedInvoiceLines.every(({ line, index }) =>
      (newReceivedByInvoiceLine.get(index) ?? new Prisma.Decimal(0)).greaterThanOrEqualTo(new Prisma.Decimal(line.quantity)));
    const requestSnapshot = JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
    const deliveryDate = day(input.deliveryDate);
    const receipt = await tx.purchaseReceipt.create({ data: { restaurantId, orderId, supplierId: supplier.id,
      actorId, operationId: input.operationId, invoiceReference: invoice.reference.trim(),
      invoiceReferenceNormalized: invoiceKey(invoice.reference), invoiceDocumentId: input.invoiceDocumentId,
      invoiceDocumentRevision: invoiceDocument.revision, deliveryReference: input.deliveryReference.trim(),
      deliveryDate, sourceDocumentId: invoice.sourceDocumentId ?? null,
      sourceContentHash: invoice.sourceContentHash ?? null, simulated, provenance: simulated ? "demo_simulation" : "recorded",
      invoiceComplete, requestSnapshot,
      lines: { create: validated.map((line) => ({ orderLineId: line.orderLine.id,
        productId: line.orderLine.productId, productName: line.orderLine.productName,
        invoiceLineIndex: line.entry.invoiceLineIndex, invoiceQuantity: line.invoiceQuantity,
        receivedQuantity: line.receivedQuantity, quantityDifference: line.quantityDifference,
        unit: line.orderLine.unit, orderedQuantity: line.orderLine.quantity,
        orderedUnitPrice: line.orderLine.pricePerUnit, invoiceUnitPrice: line.invoiceUnitPrice,
        priceDifferenceReason: line.priceDifferenceReason ?? null })) },
    }, include: { lines: true } });

    const stockMovementByReceiptLine = new Map<string, string>();
    if (!simulated) for (const line of receipt.lines) {
      if (!line.receivedQuantity.greaterThan(0)) continue;
      const product = await getReceiptProduct(tx, restaurantId, line.productId);
      if (!product || product.supplierId !== supplier.id || product.unit !== line.unit)
        throw new WorkspaceError(409, "PRODUCT_CHANGED", "Le produit, son fournisseur ou son unité a changé pendant le rapprochement.");
      const expiresAt = input.lines.find((entry) => entry.invoiceLineIndex === line.invoiceLineIndex)?.expiresAt;
      const movement = await creditReceiptStock(tx, restaurantId, product, deliveryDate, {
        purchaseReceiptLineId: line.id, delta: line.receivedQuantity, reason: "purchase_receipt",
        operationId: `purchase-receipt:${receipt.id}:${line.orderLineId}`, actorId,
        invoiceDocumentId: input.invoiceDocumentId, invoiceRevision: invoiceDocument.revision,
        ...(invoice.sourceDocumentId ? { sourceDocumentId: invoice.sourceDocumentId,
          sourceContentHash: invoice.sourceContentHash, sourceDocumentRevision: invoice.sourceDocumentRevision } : {}),
        unitPriceSnapshot: line.invoiceUnitPrice,
      }, { lineId: line.id, receivedAt: deliveryDate, expiresAt: expiresAt ? day(expiresAt) : null, unitCost: line.invoiceUnitPrice });
      stockMovementByReceiptLine.set(line.id, movement.id);
    }

    const orderComplete = order.lines.every((line) =>
      (newReceivedByOrderLine.get(line.id) ?? new Prisma.Decimal(0)).greaterThanOrEqualTo(line.quantity));
    const anyOrderQuantityReceived = [...newReceivedByOrderLine.values()].some((quantity) => quantity.greaterThan(0));
    if (anyOrderQuantityReceived) await tx.purchaseOrder.update({ where: { restaurantId_operationId: {
      restaurantId, operationId: order.operationId,
    } }, data: { status: simulated ? orderComplete ? "simulated_received" : "simulated_partially_received"
      : orderComplete ? "received" : "partially_received" } });

    if (invoiceComplete) {
      const nextInvoice = { ...invoice, status: "received" as const,
        receivedAt: new Date().toISOString(), receivedBy: actorId, stockEffect: simulated ? "none" as const : "recorded" as const };
      const saved = await tx.workspaceDocument.update({ where: { restaurantId_kind: {
        restaurantId, kind: `invoice:${input.invoiceDocumentId}`,
      } }, data: { data: nextInvoice, revision: { increment: 1 } } });
      await recordSourceInvoiceRevision(tx, restaurantId, actorId, nextInvoice, saved.revision);
    }
    const receiptWithMovement = { ...receipt, lines: receipt.lines.map((line) => ({ ...line,
      movement: stockMovementByReceiptLine.has(line.id) ? { id: stockMovementByReceiptLine.get(line.id)! } : null })) };
    return { ...purchaseReceiptDto(receiptWithMovement), replayed: false };
  });
}

export async function getPurchaseReceiptLineEvidence(restaurantId: string, lineId: string, db: ReceiptDatabase = prisma): Promise<PurchaseReceiptLineEvidence> {
  const line = await db.purchaseReceiptLine.findFirst({ where: { restaurantId, id: lineId }, include: {
    receipt: { select: { deliveryReference: true, deliveryDate: true, simulated: true, provenance: true } },
    product: { select: { unit: true } },
  } });
  if (!line) throw new WorkspaceError(404, "RECEIPT_LINE_NOT_FOUND", "Ligne de réception introuvable dans cet espace.");
  if (line.receipt.simulated || line.receipt.provenance !== "recorded")
    throw new WorkspaceError(409, "SIMULATED_RECEIPT_NOT_ELIGIBLE", "Cette réception ne peut pas fonder une proposition opérationnelle.");
  if (!line.receivedQuantity.greaterThan(0))
    throw new WorkspaceError(409, "EMPTY_RECEIPT_LINE", "La ligne de réception ne contient aucune quantité positive.");
  if (line.unit !== line.product.unit)
    throw new WorkspaceError(409, "RECEIPT_PRODUCT_UNIT_CHANGED", "L’unité du produit ne correspond plus à celle de la réception.");
  return { receiptLineId: line.id, productId: line.productId, productName: line.productName,
    deliveryReference: line.receipt.deliveryReference, deliveryDate: line.receipt.deliveryDate.toISOString().slice(0, 10),
    receivedQuantity: Number(line.receivedQuantity), unit: line.unit };
}
