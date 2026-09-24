import { isDeepStrictEqual } from "node:util";
import { Prisma, type PurchaseReceipt as PurchaseReceiptRecord, type PurchaseReceiptLine as PurchaseReceiptLineRecord,
  type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { invoiceSchema, sourceInvoiceDocumentSchema, validateSourceReview } from "./invoiceService.js";

type ReceiptDatabase = PrismaClient | Prisma.TransactionClient;
type ReceiptWithLines = PurchaseReceiptRecord & { lines: PurchaseReceiptLineRecord[] };
type PurchaseOrderWithReceipts = Prisma.PurchaseOrderGetPayload<{ include: {
  lines: true; receipts: { include: { lines: true } };
} }>;

export interface PurchaseReceiptInput {
  operationId: string;
  invoiceDocumentId: string;
  invoiceDocumentRevision: number;
  deliveryReference: string;
  deliveryDate: string;
  lines: Array<{ invoiceLineIndex: number; orderLineId: string; receivedQuantity: number; priceDifferenceReason?: string }>;
}

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const invoiceKey = (value: string) => value.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleUpperCase("fr-FR");

export function purchaseReceiptDto(receipt: ReceiptWithLines) {
  return { id: receipt.id, orderId: receipt.orderId, supplierId: receipt.supplierId,
    invoiceReference: receipt.invoiceReference, invoiceDocumentId: receipt.invoiceDocumentId,
    invoiceDocumentRevision: receipt.invoiceDocumentRevision, deliveryReference: receipt.deliveryReference,
    deliveryDate: receipt.deliveryDate.toISOString().slice(0, 10), simulated: receipt.simulated,
    provenance: receipt.provenance, invoiceComplete: receipt.invoiceComplete, createdAt: receipt.createdAt.toISOString(),
    lines: receipt.lines.map((line) => ({ id: line.id, orderLineId: line.orderLineId, productId: line.productId,
      productName: line.productName, invoiceLineIndex: line.invoiceLineIndex, invoiceQuantity: Number(line.invoiceQuantity),
      receivedQuantity: Number(line.receivedQuantity), quantityDifference: Number(line.quantityDifference), unit: line.unit,
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
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.purchaseReceipt.findUnique({ where: { restaurantId_operationId: {
      restaurantId, operationId: input.operationId,
    } }, include: { lines: true } });
    if (prior) {
      if (!sameSnapshot(prior.requestSnapshot, input))
        throw new WorkspaceError(409, "RECEIPT_OPERATION_CONFLICT", "Cette opération de réception a déjà été utilisée avec d’autres valeurs.");
      return { ...purchaseReceiptDto(prior), replayed: true };
    }

    if (input.deliveryDate > parisToday()) throw new WorkspaceError(400, "FUTURE_DELIVERY_DATE", "La date de livraison ne peut pas être future.");
    const [workspace, invoiceDocument, order] = await Promise.all([
      tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
      tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: `invoice:${input.invoiceDocumentId}` } } }),
      tx.purchaseOrder.findFirst({ where: { restaurantId, id: orderId }, include: { lines: true } }),
    ]);
    if (!workspace) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
    if (!invoiceDocument) throw new WorkspaceError(404, "INVOICE_NOT_FOUND", "Facture brouillon introuvable dans cet espace.");
    if (invoiceDocument.revision !== input.invoiceDocumentRevision)
      throw new WorkspaceError(409, "INVOICE_REVISION_CONFLICT", "La facture a changé. Rechargez-la avant le rapprochement.");
    const invoice = invoiceSchema.parse(invoiceDocument.data);
    if (invoice.status !== "draft") throw new WorkspaceError(409, "INVOICE_ALREADY_RECEIVED", "Cette facture est déjà réceptionnée.");
    if (!invoice.reference.trim() || !invoice.date || !invoice.supplierId)
      throw new WorkspaceError(409, "INVOICE_REVIEW_REQUIRED", "Enregistrez la référence, la date et le fournisseur de la facture avant rapprochement.");
    if (invoice.source === "demo" && workspace.mode !== "demo")
      throw new WorkspaceError(409, "DEMO_INVOICE_IN_OPERATIONAL_WORKSPACE", "Une facture d’exemple ne peut pas être utilisée dans un espace réel.");
    if (invoice.source === "source_document" && workspace.mode !== "demo")
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
      const sourcePrefix = `restaurant-simulation-v1:invoice:${invoice.sourceDocumentId}:`;
      const priorCredit = await tx.stockMovement.findFirst({ where: { restaurantId, OR: [
        { sourceDocumentId: invoice.sourceDocumentId }, { operationId: { startsWith: sourcePrefix } },
      ] }, select: { id: true } });
      if (priorCredit) throw new WorkspaceError(409, "SOURCE_ALREADY_CREDITED", "Cette pièce a déjà ajouté du stock dans la démonstration.");
    }
    if (!order) throw new WorkspaceError(404, "ORDER_NOT_FOUND", "Commande introuvable dans cet espace.");
    const simulated = workspace.mode === "demo";
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

    const stockProductIds = [...new Set(validated.filter((line) => line.receivedQuantity.greaterThan(0))
      .map((line) => line.orderLine.productId))].sort();
    if (stockProductIds.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product"
      WHERE "restaurantId" = ${restaurantId} AND id IN (${Prisma.join(stockProductIds)}) ORDER BY id FOR UPDATE`);

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
    const receipt = await tx.purchaseReceipt.create({ data: { restaurantId, orderId, supplierId: supplier.id,
      actorId, operationId: input.operationId, invoiceReference: invoice.reference.trim(),
      invoiceReferenceNormalized: invoiceKey(invoice.reference), invoiceDocumentId: input.invoiceDocumentId,
      invoiceDocumentRevision: invoiceDocument.revision, deliveryReference: input.deliveryReference.trim(),
      deliveryDate: day(input.deliveryDate), sourceDocumentId: invoice.sourceDocumentId ?? null,
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

    if (!simulated) for (const line of receipt.lines) {
      if (!line.receivedQuantity.greaterThan(0)) continue;
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: line.productId } },
        include: { supplier: { select: { name: true } } } });
      if (!product || product.supplierId !== supplier.id || product.unit !== line.unit)
        throw new WorkspaceError(409, "PRODUCT_CHANGED", "Le produit, son fournisseur ou son unité a changé pendant le rapprochement.");
      await tx.product.updateMany({ where: { restaurantId, id: product.id }, data: {
        currentStock: { increment: line.receivedQuantity }, stockRevision: { increment: 1 },
        ...(!product.lastDelivery || product.lastDelivery < day(input.deliveryDate) ? { lastDelivery: day(input.deliveryDate) } : {}),
      } });
      await tx.stockMovement.create({ data: { restaurantId, productId: product.id, purchaseReceiptLineId: line.id,
        delta: line.receivedQuantity, reason: "purchase_receipt",
        operationId: `purchase-receipt:${receipt.id}:${line.orderLineId}`, actorId,
        invoiceDocumentId: input.invoiceDocumentId, invoiceRevision: invoiceDocument.revision,
        ...(invoice.sourceDocumentId ? { sourceDocumentId: invoice.sourceDocumentId,
          sourceContentHash: invoice.sourceContentHash, sourceDocumentRevision: invoice.sourceDocumentRevision } : {}),
        productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: supplier.name,
        unitPriceSnapshot: line.invoiceUnitPrice,
      } });
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
        receivedAt: new Date().toISOString(), receivedBy: actorId };
      const saved = await tx.workspaceDocument.update({ where: { restaurantId_kind: {
        restaurantId, kind: `invoice:${input.invoiceDocumentId}`,
      } }, data: { data: nextInvoice, revision: { increment: 1 } } });
      if (invoice.sourceDocumentId && invoice.sourceContentHash !== undefined && invoice.sourceDocumentRevision !== undefined)
        await tx.invoiceDraftRevision.create({ data: { restaurantId, invoiceDocumentId: invoice.id,
          sourceDocumentId: invoice.sourceDocumentId, sourceContentHash: invoice.sourceContentHash,
          sourceDocumentRevision: invoice.sourceDocumentRevision, revision: saved.revision, actorId,
          data: JSON.parse(JSON.stringify(nextInvoice)) as Prisma.InputJsonValue } });
    }
    return { ...purchaseReceiptDto(receipt), replayed: false };
  });
}

export const purchaseReceiptSchema = z.object({
  operationId: z.uuid(), invoiceDocumentId: z.string().trim().min(1).max(100),
  invoiceDocumentRevision: z.number().int().positive(), deliveryReference: z.string().trim().min(1).max(120),
  deliveryDate: z.iso.date(), lines: z.array(z.object({ invoiceLineIndex: z.number().int().min(0).max(99),
    orderLineId: z.string().trim().min(1).max(100), receivedQuantity: z.number().finite().min(0).max(1_000_000).multipleOf(0.001),
    priceDifferenceReason: z.string().trim().min(1).max(240).optional(),
  }).strict()).min(1).max(100),
}).strict();

export async function listPurchaseOrders(restaurantId: string, db: ReceiptDatabase = prisma) {
  const orders = await db.purchaseOrder.findMany({ where: { restaurantId }, include: {
    lines: true, receipts: { include: { lines: true }, orderBy: { createdAt: "desc" } },
  }, orderBy: { createdAt: "desc" } });
  return orders.map(orderDtoWithReceipts);
}

function orderDtoWithReceipts(order: PurchaseOrderWithReceipts) {
  const receivedByLine = new Map<string, Prisma.Decimal>();
  for (const receipt of order.receipts) for (const line of receipt.lines)
    receivedByLine.set(line.orderLineId, (receivedByLine.get(line.orderLineId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
  return { id: order.id, status: order.status, createdAt: order.createdAt.toISOString(),
    lines: order.lines.map((line) => {
      const receivedQuantity = receivedByLine.get(line.id) ?? new Prisma.Decimal(0);
      return { id: line.id, productId: line.productId, productName: line.productName, supplierId: line.supplierId,
        supplierName: line.supplierName, quantity: Number(line.quantity), receivedQuantity: Number(receivedQuantity),
        remainingQuantity: Math.max(0, Number(line.quantity) - Number(receivedQuantity)),
        unit: line.unit, pricePerUnit: Number(line.pricePerUnit) };
    }), receipts: order.receipts.map(purchaseReceiptDto),
  };
}
