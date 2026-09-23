import { apiRequest } from "../config/api";
export interface InvoiceLine { productId: string; quantity: number; unitPrice: number; }
export interface InvoiceDraft { reference: string; date: string; lines: InvoiceLine[]; }
export interface Invoice extends InvoiceDraft {
  id: string; revision: number; source: "demo" | "manual"; status: "draft" | "received"; receivedAt?: string;
}
export const getInvoices = () => apiRequest<Invoice[]>("/workspace/invoices");
export interface SourceInvoiceSummary {
  id: string; title: string; date: string | null; originalDate: string | null;
  supplier: string; type: "invoice" | "credit" | "delivery"; status: string; stockLineCount: number;
}
export interface SourceInvoiceDetail extends SourceInvoiceSummary { content: string; stockLines: { name: string; quantity: number; unit: string; unitPrice: number }[]; }
export const getSourceInvoices = () => apiRequest<SourceInvoiceSummary[]>("/workspace/source-invoices");
export const getSourceInvoice = (id: string) => apiRequest<SourceInvoiceDetail>(`/workspace/source-invoices/${encodeURIComponent(id)}`);
export const saveInvoice = (invoice: Invoice, receive: boolean) => apiRequest<Invoice>(`/workspace/invoices/${encodeURIComponent(invoice.id)}`, {
  method: "POST", body: JSON.stringify({ revision: invoice.revision, receive, draft: { reference: invoice.reference, date: invoice.date, lines: invoice.lines } }),
});
