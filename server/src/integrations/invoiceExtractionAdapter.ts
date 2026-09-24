import { createHash } from "node:crypto";
import { z } from "zod";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const invoiceMimeTypeSchema = z.enum(["application/pdf", "image/jpeg", "image/png"]);

export const invoiceExtractionFileSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/), mimeType: invoiceMimeTypeSchema,
  byteSize: z.number().int().positive().max(MAX_FILE_BYTES),
}).strict();

export function describeInvoiceFile(bytes: Uint8Array, mimeType: unknown) {
  return invoiceExtractionFileSchema.parse({
    sha256: createHash("sha256").update(bytes).digest("hex"), mimeType, byteSize: bytes.byteLength,
  });
}

const extractedLineSchema = z.object({
  name: z.string().trim().min(1).max(120), quantity: z.number().finite().positive().max(1_000_000),
  unit: z.enum(["kg", "L", "pcs"]), unitPrice: z.number().finite().min(0).max(1_000_000),
  sourceQuantityText: z.string().max(200), sourceLineNumber: z.number().int().positive(),
  priceBasis: z.enum(["stated_unit_price", "derived_from_line_amount_ht", "derived_from_line_amount_ttc"]),
  priceTaxBasis: z.enum(["HT", "TTC", "unknown"]), code: z.string().max(120).optional(),
}).strict();

export const invoiceExtractionPayloadSchema = z.object({
  sourceFileHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().trim().min(1).max(500), date: z.iso.date().nullable(),
  supplier: z.string().trim().min(1).max(200), type: z.enum(["invoice", "credit", "delivery"]),
  extractedText: z.string().max(100_000), stockLines: z.array(extractedLineSchema).max(100),
}).strict().superRefine(({ stockLines }, context) => {
  const lineNumbers = new Set<number>();
  stockLines.forEach((line, index) => {
    if (lineNumbers.has(line.sourceLineNumber)) context.addIssue({
      code: "custom", path: ["stockLines", index, "sourceLineNumber"], message: "Ligne source dupliquée.",
    });
    lineNumbers.add(line.sourceLineNumber);
  });
});

export type InvoiceExtractionFile = z.infer<typeof invoiceExtractionFileSchema>;
export type InvoiceExtractionPayload = z.infer<typeof invoiceExtractionPayloadSchema>;
export type InvoiceExtractionUnavailableReason = "not_configured" | "temporary_error" | "invalid_data";

export type InvoiceExtractionResult =
  | { status: "ok"; payload: unknown }
  | { status: "unavailable"; reason: InvoiceExtractionUnavailableReason };

export interface InvoiceExtractionAdapter {
  provider: string;
  extract(input: { file: InvoiceExtractionFile; bytes: Uint8Array }): Promise<InvoiceExtractionResult>;
}

export const unconfiguredInvoiceExtractionAdapter: InvoiceExtractionAdapter = {
  provider: "unconfigured",
  async extract() { return { status: "unavailable", reason: "not_configured" }; },
};
