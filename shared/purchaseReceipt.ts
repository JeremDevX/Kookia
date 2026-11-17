import { z } from "zod";
import { confirmedInvoiceDuplicatesSchema } from "./invoice.js";

export const purchaseReceiptSchema = z.object({
  confirmedDuplicates: confirmedInvoiceDuplicatesSchema.optional(),
  operationId: z.uuid(), invoiceDocumentId: z.string().trim().min(1).max(100),
  invoiceDocumentRevision: z.number().int().positive(), deliveryReference: z.string().trim().min(1).max(120),
  deliveryDate: z.iso.date(), lines: z.array(z.object({ invoiceLineIndex: z.number().int().min(0).max(99),
    orderLineId: z.string().trim().min(1).max(100), receivedQuantity: z.number().finite().min(0).max(1_000_000).multipleOf(0.001),
    priceDifferenceReason: z.string().trim().min(1).max(240).optional(), expiresAt: z.iso.date().nullable().optional(),
  }).strict()).min(1).max(100),
}).strict();

export type PurchaseReceiptInput = z.infer<typeof purchaseReceiptSchema>;

export interface PurchaseReceiptLineEvidence {
  receiptLineId: string;
  productId: string;
  productName: string;
  deliveryReference: string;
  deliveryDate: string;
  receivedQuantity: number;
  unit: string;
}
