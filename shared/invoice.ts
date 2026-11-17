import { z } from "zod";

const priceBasisSchema = z.enum(["stated_unit_price", "derived_from_line_amount_ht", "derived_from_line_amount_ttc"]);
const taxBasisSchema = z.enum(["HT", "TTC", "unknown"]);
const sourceUnitSchema = z.enum(["kg", "L", "pcs"]);
export const sourceInvoiceTypeSchema = z.enum(["invoice", "credit", "delivery"]);
export const sourceInvoiceLineSchema = z.object({
  name: z.string().min(1).max(120), quantity: z.number().finite().positive().max(1_000_000),
  unit: sourceUnitSchema, unitPrice: z.number().finite().min(0).max(1_000_000),
  sourceQuantityText: z.string().max(200), sourceLineNumber: z.number().int().positive(),
  priceBasis: priceBasisSchema, priceTaxBasis: taxBasisSchema, code: z.string().max(120).optional(),
});

const dispositionSchema = z.enum(["pending", "stock", "excluded"]);
const unitSchema = z.string().trim().min(1).max(10);
const invoiceLineSchema = z.object({
  productId: z.string().max(100), quantity: z.number().finite().min(0).max(1_000_000).multipleOf(0.001),
  unitPrice: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001), unit: z.union([unitSchema, z.literal("")]).optional(),
  sourceLineNumber: z.number().int().positive().optional(), disposition: dispositionSchema.optional(),
  exclusionReason: z.enum(["not_stock_item", "not_readable", "not_applicable", "other"]).optional(),
  sourceName: z.string().max(120).optional(), sourceQuantityText: z.string().max(200).optional(),
  sourceQuantity: z.number().finite().positive().optional(), sourceUnit: sourceUnitSchema.optional(),
  sourceUnitPrice: z.number().finite().min(0).optional(), sourcePriceBasis: priceBasisSchema.optional(),
  sourceTaxBasis: taxBasisSchema.optional(), sourceCode: z.string().max(120).optional(),
}).strict();

export const invoiceDraftSchema = z.object({
  reference: z.string().trim().min(1).max(120), date: z.union([z.iso.date(), z.literal("")]),
  supplierId: z.string().trim().min(1).max(100).optional(),
  lines: z.array(invoiceLineSchema).max(100), sourceTypeConfirmed: z.boolean().optional(), sourceDateConfirmed: z.boolean().optional(),
}).strict().refine((draft) => {
  const sourceLineNumbers = draft.lines.flatMap((line) => line.sourceLineNumber === undefined ? [] : [line.sourceLineNumber]);
  return new Set(sourceLineNumbers).size === sourceLineNumbers.length;
});

export const confirmedInvoiceDuplicatesSchema = z.array(
  z.object({ id: z.string().max(100), version: z.string().max(50) }).strict(),
).max(100);
const stockEffectSchema = z.enum(["none", "recorded", "demo_simulation"]);
export const invoiceFields = {
  ...invoiceDraftSchema.shape,
  id: z.string(), status: z.enum(["draft", "received"]), source: z.enum(["demo", "manual", "source_document"]),
  receivedAt: z.iso.datetime().optional(), receivedBy: z.string().optional(),
  sourceDocumentId: z.string().regex(/^[a-f0-9]{24}$/).optional(), sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sourceDocumentRevision: z.number().int().nonnegative().optional(), sourceTitle: z.string().max(500).optional(),
  sourceSupplier: z.string().max(200).optional(), sourceType: sourceInvoiceTypeSchema.optional(),
  sourceStatus: z.string().max(200).optional(), sourceLineCount: z.number().int().nonnegative().optional(),
  provenance: z.literal("demo_simulation").optional(), alreadyCreditedBySimulation: z.boolean().optional(),
  stockEffect: stockEffectSchema.optional(),
};

export const invoiceResponseSchema = z.object({
  ...invoiceFields,
  revision: z.number().int().nonnegative(), sourceDate: z.iso.date().nullable().optional(),
  sourceReceiptStockEffect: z.enum(["none", "demo_simulation"]).optional(),
  receiptProgress: z.array(z.object({
    invoiceLineIndex: z.number().int().nonnegative(), orderLineId: z.string(), receivedQuantity: z.number(),
  })).optional(),
});

export const saveInvoiceRequestSchema = z.object({
  draft: invoiceDraftSchema, revision: z.number().int().nonnegative(), receive: z.boolean(),
  confirmedDuplicates: confirmedInvoiceDuplicatesSchema.optional(),
}).strict();

export type Invoice = z.infer<typeof invoiceResponseSchema>;
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;
export type SourceLineDisposition = z.infer<typeof dispositionSchema>;
export type InvoiceStockEffect = z.infer<typeof stockEffectSchema>;
export type SaveInvoiceRequest = z.infer<typeof saveInvoiceRequestSchema>;
export type SaveInvoiceResponse = Invoice & { stockEffect: InvoiceStockEffect };

export interface SourceInvoiceSummary {
  id: string; title: string; date: string | null; supplier: string;
  type: z.infer<typeof sourceInvoiceTypeSchema>; status: string; stockLineCount: number;
  invoiceId?: string; invoiceStatus?: Invoice["status"]; receivedAt?: string;
  alreadyCreditedBySimulation: boolean; sourceMovementCount: number;
}

export interface SourceInvoiceDetail extends SourceInvoiceSummary {
  content: string;
  stockLines: Array<z.infer<typeof sourceInvoiceLineSchema>>;
}
