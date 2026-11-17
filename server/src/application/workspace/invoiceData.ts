import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { invoiceDraftSchema, invoiceFields, invoiceResponseSchema, sourceInvoiceLineSchema, sourceInvoiceTypeSchema,
  type Invoice } from "../../../../shared/invoice.js";

export const invoiceSchema = invoiceDraftSchema.safeExtend({
  ...invoiceFields,
  sourceDemoDate: z.iso.date().nullable().optional(),
  sourceOriginalDate: z.iso.date().nullable().optional(),
});

type StoredInvoice = z.infer<typeof invoiceSchema>;

export function invoiceDto(invoice: StoredInvoice & Pick<Invoice, "revision" | "receiptProgress" | "sourceReceiptStockEffect">): Invoice {
  return invoiceResponseSchema.parse({ ...invoice, sourceDate: invoice.sourceDemoDate });
}

export const sourceInvoiceDocumentSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).max(500), date: z.iso.date().nullable(), originalDate: z.iso.date().nullable(),
  supplier: z.string().min(1).max(200), type: sourceInvoiceTypeSchema, status: z.string().max(200),
  content: z.string(), stockLines: z.array(sourceInvoiceLineSchema).max(100),
});

export function sourceInvoiceContentForWorkspace(content: string, workingDate: string | null) {
  return content.split(/\r?\n/).flatMap((line) => {
    if (/^- Date[^\n]*\(pièce d’origine\)\s*:/i.test(line)) return [];
    if (/^- Date décalée de la pièce \(démonstration\)\s*:/i.test(line))
      return [`- Date de travail : ${workingDate ?? "inconnue"}`];
    return [line];
  }).join("\n");
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
