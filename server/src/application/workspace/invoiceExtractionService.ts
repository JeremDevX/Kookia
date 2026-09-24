import { createHash } from "node:crypto";
import { WorkspaceError } from "./catalogService.js";
import { sourceInvoiceDocumentSchema } from "./invoiceService.js";
import { invoiceExtractionFileSchema, invoiceExtractionPayloadSchema } from "../../integrations/invoiceExtractionAdapter.js";

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
