import { apiRequest } from "../config/api";
import type { Invoice, SaveInvoiceRequest, SaveInvoiceResponse, SourceInvoiceDetail,
  SourceInvoiceSummary } from "../../shared/invoice";
export type { Invoice, SourceInvoiceDetail, SourceInvoiceSummary } from "../../shared/invoice";

export const getInvoices = () => apiRequest<Invoice[]>("/workspace/invoices");
export const getSourceInvoices = () => apiRequest<SourceInvoiceSummary[]>("/workspace/source-invoices");
export const getSourceInvoice = (id: string) => apiRequest<SourceInvoiceDetail>(`/workspace/source-invoices/${encodeURIComponent(id)}`);
export const createInvoiceDraftFromSource = (id: string) => apiRequest<Invoice>(`/workspace/invoices/from-source/${encodeURIComponent(id)}`, {
  method: "POST", body: JSON.stringify({}),
});
export function saveInvoice(invoice: Invoice, receive: boolean, confirmedDuplicates?: SaveInvoiceRequest["confirmedDuplicates"]) {
  const { revision, reference, date, lines, supplierId, sourceTypeConfirmed, sourceDateConfirmed } = invoice;
  const request: SaveInvoiceRequest = {
    revision, receive, confirmedDuplicates,
    draft: { reference, date, lines, supplierId: supplierId || undefined, sourceTypeConfirmed, sourceDateConfirmed },
  };
  return apiRequest<SaveInvoiceResponse>(`/workspace/invoices/${encodeURIComponent(invoice.id)}`, {
    method: "POST", body: JSON.stringify(request),
  });
}

export const getReceiptInvoices = (orderId: string) => apiRequest<Invoice[]>(`/workspace/orders/${encodeURIComponent(orderId)}/receipt-invoices`);
