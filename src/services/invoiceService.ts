import { apiRequest } from "../config/api";
export type SourceLineDisposition = "pending" | "stock" | "excluded";
export interface InvoiceLine {
  productId: string; quantity: number; unitPrice: number; unit?: string; sourceLineNumber?: number;
  disposition?: SourceLineDisposition; exclusionReason?: "not_stock_item" | "not_readable" | "not_applicable" | "other";
  sourceName?: string; sourceQuantityText?: string; sourceQuantity?: number; sourceUnit?: "kg" | "L" | "pcs";
  sourceUnitPrice?: number; sourcePriceBasis?: string; sourceTaxBasis?: "HT" | "TTC" | "unknown"; sourceCode?: string;
}
export interface InvoiceDraft {
  reference: string; date: string; supplierId?: string; lines: InvoiceLine[];
  sourceTypeConfirmed?: boolean; sourceDateConfirmed?: boolean;
}
export interface Invoice extends InvoiceDraft {
  id: string; revision: number; source: "demo" | "manual" | "source_document"; status: "draft" | "received";
  receivedAt?: string; receivedBy?: string; sourceDocumentId?: string; sourceContentHash?: string;
  sourceDocumentRevision?: number; sourceTitle?: string; sourceSupplier?: string;
  sourceType?: "invoice" | "credit" | "delivery"; sourceStatus?: string;
  sourceDemoDate?: string | null; sourceOriginalDate?: string | null; sourceLineCount?: number;
  provenance?: "demo_simulation"; alreadyCreditedBySimulation?: boolean;
  receiptProgress?: Array<{ invoiceLineIndex: number; orderLineId: string; receivedQuantity: number }>;
}
export const getInvoices = () => apiRequest<Invoice[]>("/workspace/invoices");
export interface SourceInvoiceSummary {
  id: string; title: string; date: string | null; originalDate: string | null;
  supplier: string; type: "invoice" | "credit" | "delivery"; status: string; stockLineCount: number;
  invoiceId?: string; invoiceStatus?: "draft" | "received"; receivedAt?: string;
  alreadyCreditedBySimulation: boolean; sourceMovementCount: number;
}
export interface SourceInvoiceLine {
  name: string; quantity: number; unit: "kg" | "L" | "pcs"; unitPrice: number; sourceQuantityText: string;
  sourceLineNumber: number; priceBasis: string; priceTaxBasis: "HT" | "TTC" | "unknown"; code?: string;
}
export interface SourceInvoiceDetail extends SourceInvoiceSummary { content: string; stockLines: SourceInvoiceLine[]; }
export const getSourceInvoices = () => apiRequest<SourceInvoiceSummary[]>("/workspace/source-invoices");
export const getSourceInvoice = (id: string) => apiRequest<SourceInvoiceDetail>(`/workspace/source-invoices/${encodeURIComponent(id)}`);
export const createInvoiceDraftFromSource = (id: string) => apiRequest<Invoice>(`/workspace/invoices/from-source/${encodeURIComponent(id)}`, {
  method: "POST", body: JSON.stringify({}),
});
export const saveInvoice = (invoice: Invoice, receive: boolean) => apiRequest<Invoice>(`/workspace/invoices/${encodeURIComponent(invoice.id)}`, {
  method: "POST", body: JSON.stringify({ revision: invoice.revision, receive, draft: {
    reference: invoice.reference, date: invoice.date, lines: invoice.lines,
    ...(invoice.supplierId ? { supplierId: invoice.supplierId } : {}),
    ...(invoice.sourceTypeConfirmed !== undefined ? { sourceTypeConfirmed: invoice.sourceTypeConfirmed } : {}),
    ...(invoice.sourceDateConfirmed !== undefined ? { sourceDateConfirmed: invoice.sourceDateConfirmed } : {}),
  } }),
});
