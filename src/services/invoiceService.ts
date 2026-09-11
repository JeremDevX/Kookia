import { apiRequest } from "../config/api";
export interface InvoiceLine { productId: string; quantity: number; unitPrice: number; }
export interface InvoiceDraft { reference: string; date: string; lines: InvoiceLine[]; }
export interface Invoice extends InvoiceDraft {
  id: string; revision: number; source: "demo" | "manual"; status: "draft" | "received"; receivedAt?: string;
}
export const getInvoices = () => apiRequest<Invoice[]>("/workspace/invoices");
export const saveInvoice = (invoice: Invoice, receive: boolean) => apiRequest<Invoice>(`/workspace/invoices/${encodeURIComponent(invoice.id)}`, {
  method: "POST", body: JSON.stringify({ revision: invoice.revision, receive, draft: { reference: invoice.reference, date: invoice.date, lines: invoice.lines } }),
});
