import type { Invoice, SourceInvoiceSummary } from "../../../../shared/invoice.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { invoiceSchema, sourceInvoiceKind, sourceInvoiceMovementPrefix, sourceMovementPrefix, sourceStockEffect } from "./invoiceData.js";
import { simulationActor } from "./operationProvenance.js";
import { WorkspaceError } from "./workspaceError.js";

type SourceInvoiceWorkflowState = Pick<SourceInvoiceSummary,
  "invoiceId" | "invoiceStatus" | "receivedAt" | "alreadyCreditedBySimulation" | "sourceMovementCount">;

function findSourceMovements(restaurantId: string, sourceDocumentIds: string[]) {
  const prefix = sourceDocumentIds.length === 1 ? sourceMovementPrefix(sourceDocumentIds[0]) : sourceInvoiceMovementPrefix;
  return prisma.stockMovement.findMany({ where: { restaurantId, reason: "invoice_import_demo", operationId: { startsWith: prefix } },
    select: { operationId: true, actorId: true, invoiceDocumentId: true } });
}

function summarizeSourceMovements(sourceDocumentIds: string[], movements: Awaited<ReturnType<typeof findSourceMovements>>) {
  const states = new Map(sourceDocumentIds.map((id) => [id, { alreadyCreditedBySimulation: false, sourceMovementCount: 0 }]));
  for (const movement of movements) {
    // Older movements identify their source only through the operation ID.
    const separator = movement.operationId.indexOf(":", sourceInvoiceMovementPrefix.length);
    if (separator < 0) continue;
    const sourceId = movement.operationId.slice(sourceInvoiceMovementPrefix.length, separator);
    const state = states.get(sourceId);
    if (!state) continue;
    state.sourceMovementCount++;
    if (movement.actorId === simulationActor && !movement.invoiceDocumentId) state.alreadyCreditedBySimulation = true;
  }
  return states;
}

export async function getSourceInvoiceWorkflowStates(restaurantId: string, sourceDocumentIds: string[]) {
  if (sourceDocumentIds.length === 0) return new Map<string, SourceInvoiceWorkflowState>();
  const [draftDocuments, movements] = await prisma.$transaction([
    prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { in: sourceDocumentIds.map(sourceInvoiceKind) } }, select: { data: true } }),
    findSourceMovements(restaurantId, sourceDocumentIds),
  ]);
  const states: Map<string, SourceInvoiceWorkflowState> = summarizeSourceMovements(sourceDocumentIds, movements);
  for (const { data } of draftDocuments) {
    const invoice = invoiceSchema.parse(data);
    if (!invoice.sourceDocumentId) continue;
    const state = states.get(invoice.sourceDocumentId);
    if (!state) continue;
    states.set(invoice.sourceDocumentId, {
      alreadyCreditedBySimulation: state.alreadyCreditedBySimulation, sourceMovementCount: state.sourceMovementCount,
      invoiceId: invoice.id, invoiceStatus: invoice.status, ...(invoice.receivedAt ? { receivedAt: invoice.receivedAt } : {}),
    });
  }
  return states;
}

async function readInvoices(restaurantId: string) {
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "invoice:" } },
    select: { data: true, revision: true }, orderBy: { updatedAt: "desc" } });
  return documents.map(({ data, revision }) => ({ ...invoiceSchema.parse(data), revision }));
}

async function readReceiptProgress(restaurantId: string, invoiceIds: string[]) {
  const byInvoice = new Map<string, NonNullable<Invoice["receiptProgress"]>>();
  if (invoiceIds.length === 0) return byInvoice;
  const receipts = await prisma.purchaseReceipt.findMany({ where: { restaurantId, invoiceDocumentId: { in: invoiceIds } },
    select: { invoiceDocumentId: true, lines: { select: { invoiceLineIndex: true, orderLineId: true, receivedQuantity: true } } } });
  for (const receipt of receipts) {
    const progress = byInvoice.get(receipt.invoiceDocumentId) ?? [];
    for (const line of receipt.lines) progress.push({ ...line, receivedQuantity: Number(line.receivedQuantity) });
    byInvoice.set(receipt.invoiceDocumentId, progress);
  }
  return byInvoice;
}

export async function getInvoices(restaurantId: string) {
  const invoices = await readInvoices(restaurantId);
  const sourceIds = invoices.flatMap((invoice) => invoice.sourceDocumentId ? [invoice.sourceDocumentId] : []);
  const [movements, workspace, progressByInvoice] = await Promise.all([
    sourceIds.length ? findSourceMovements(restaurantId, sourceIds) : [],
    sourceIds.length ? prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }) : null,
    readReceiptProgress(restaurantId, invoices.map((invoice) => invoice.id)),
  ]);
  const sourceStates = summarizeSourceMovements(sourceIds, movements);
  const sourceReceiptStockEffect = sourceStockEffect(workspace?.mode);
  return invoices.map((invoice) => ({ ...invoice,
    ...(invoice.sourceDocumentId ? { sourceReceiptStockEffect,
      alreadyCreditedBySimulation: sourceStates.get(invoice.sourceDocumentId)?.alreadyCreditedBySimulation ?? false } : {}),
    ...(progressByInvoice.has(invoice.id) ? { receiptProgress: progressByInvoice.get(invoice.id) } : {}),
  }));
}

export async function getOrderReceiptInvoices(restaurantId: string, orderId: string): Promise<Invoice[]> {
  const order = await prisma.purchaseOrder.findUnique({ where: { restaurantId_id: { restaurantId, id: orderId } },
    select: { status: true, lines: { select: { productId: true, supplierId: true, unit: true } } } });
  if (!order) throw new WorkspaceError(404, "NOT_FOUND", "Commande introuvable.");
  const invoices = (await readInvoices(restaurantId)).filter((invoice) => invoice.status === "draft" && invoice.supplierId &&
    (order.status.startsWith("simulated") || invoice.source === "manual") &&
    order.lines.some((line) => line.supplierId === invoice.supplierId && invoice.lines.some((item) =>
      item.productId === line.productId && item.unit === line.unit)));
  const progressByInvoice = await readReceiptProgress(restaurantId, invoices.map((invoice) => invoice.id));
  return invoices.map((invoice) => ({ id: invoice.id, revision: invoice.revision, source: invoice.source, status: invoice.status,
    reference: invoice.reference, date: invoice.date, supplierId: invoice.supplierId, lines: invoice.lines,
    sourceTypeConfirmed: invoice.sourceTypeConfirmed, sourceDateConfirmed: invoice.sourceDateConfirmed,
    receiptProgress: progressByInvoice.get(invoice.id) }));
}
