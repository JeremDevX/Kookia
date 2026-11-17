import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { invoiceDraftSchema, invoiceFields, invoiceResponseSchema, type Invoice } from "../../../../shared/invoice.js";

export const invoiceSchema = invoiceDraftSchema.safeExtend({
  ...invoiceFields,
  sourceDemoDate: z.iso.date().nullable().optional(),
  sourceOriginalDate: z.iso.date().nullable().optional(),
});

type StoredInvoice = z.infer<typeof invoiceSchema>;

export function invoiceDto(invoice: StoredInvoice & Pick<Invoice, "revision" | "receiptProgress" | "sourceReceiptStockEffect">): Invoice {
  return invoiceResponseSchema.parse({ ...invoice, sourceDate: invoice.sourceDemoDate });
}

export async function recordSourceInvoiceRevision(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  invoice: StoredInvoice, revision: number) {
  const { id, sourceDocumentId, sourceContentHash, sourceDocumentRevision } = invoice;
  if (sourceDocumentId === undefined || sourceContentHash === undefined || sourceDocumentRevision === undefined) return;
  await tx.invoiceDraftRevision.create({ data: {
    restaurantId, invoiceDocumentId: id, sourceDocumentId, sourceContentHash, sourceDocumentRevision,
    revision, actorId, data: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue,
  } });
}
