import { createHash } from "node:crypto";
import { WorkspaceError } from "./catalogService.js";
import { sourceInvoiceDocumentSchema } from "./invoiceService.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { invoiceExtractionFileSchema, invoiceExtractionPayloadSchema,
  type InvoiceExtractionAdapter, type InvoiceExtractionFile } from "../../integrations/invoiceExtractionAdapter.js";

export function mapInvoiceExtractionToSourceDocument(restaurantId: string, fileInput: unknown, payloadInput: unknown) {
  const file = invoiceExtractionFileSchema.parse(fileInput);
  const extraction = invoiceExtractionPayloadSchema.parse(payloadInput);
  if (extraction.sourceFileHash !== file.sha256) {
    throw new WorkspaceError(409, "EXTRACTION_SOURCE_MISMATCH", "L’extraction ne correspond pas au fichier source.");
  }
  const id = createHash("sha256").update(`${restaurantId}:${file.sha256}`).digest("hex").slice(0, 24);
  return sourceInvoiceDocumentSchema.parse({
    id, contentHash: file.sha256, title: extraction.title, date: extraction.date,
    originalDate: extraction.date, supplier: extraction.supplier, type: extraction.type,
    status: "Extraction candidate à vérifier", content: extraction.extractedText,
    stockLines: extraction.type === "invoice" ? extraction.stockLines : [],
  });
}

export async function extractInvoiceCandidate(restaurantId: string, file: InvoiceExtractionFile,
  bytes: Uint8Array, adapter: InvoiceExtractionAdapter) {
  const result = await adapter.extract({ file, bytes });
  if (result.status === "unavailable") return result;

  const source = mapInvoiceExtractionToSourceDocument(restaurantId, file, result.payload);
  const kind = `source-invoice:${source.id}`;
  const existing = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
  if (existing) return { status: "ok" as const, source: sourceInvoiceDocumentSchema.parse(existing.data), created: false };

  try {
    await prisma.workspaceDocument.create({ data: { restaurantId, kind, data: source } });
    return { status: "ok" as const, source, created: true };
  } catch (error) {
    const replayed = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    if (replayed) return { status: "ok" as const, source: sourceInvoiceDocumentSchema.parse(replayed.data), created: false };
    throw error;
  }
}
