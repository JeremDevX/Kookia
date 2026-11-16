import type { PurchaseReceiptInput, PurchaseReceiptLineEvidence } from "../../shared/purchaseReceipt";
import type { PurchaseSuggestions } from "../../shared/purchaseSuggestions";
import { apiRequest } from "../config/api";

export type { PurchaseReceiptInput, PurchaseReceiptLineEvidence } from "../../shared/purchaseReceipt";
export type { PurchaseSuggestion, PurchaseSuggestions } from "../../shared/purchaseSuggestions";

export interface OrderLineInput { productId: string; quantity: number; predictionId?: string; cartId?: string; }
export interface PurchaseOrder {
  id: string; status: string; createdAt: string;
  lines: { id: string; productId: string; productName: string; supplierId: string; supplierName: string;
    expectedDeliveryDate?: string | null; deliveryRevision?: number; deliveryNote?: string | null;
    quantity: number; receivedQuantity: number; remainingQuantity: number; unit: string; pricePerUnit: number }[];
  receipts: Array<{ id: string; invoiceReference: string; invoiceDocumentId: string; deliveryReference: string;
    deliveryDate: string; simulated: boolean; provenance: string; invoiceComplete: boolean;
    lines: Array<{ id: string; orderLineId: string; productId: string; productName: string;
      invoiceLineIndex: number; invoiceQuantity: number; receivedQuantity: number; quantityDifference: number; unit: string;
      stockMovementId: string | null;
      orderedUnitPrice: number; invoiceUnitPrice: number; priceDifferenceReason?: string }> }>;
}

export const getOrders = () => apiRequest<PurchaseOrder[]>("/workspace/orders");
export const getPurchaseReceiptLineEvidence = (lineId: string) => apiRequest<PurchaseReceiptLineEvidence>(
  `/workspace/orders/receipt-lines/${encodeURIComponent(lineId)}`);
export const validateOrder = (operationId: string, lines: OrderLineInput[]) => apiRequest<PurchaseOrder>("/workspace/orders", {
  method: "POST", body: JSON.stringify({ operationId, lines }),
});
export const getPurchaseSuggestions = () => apiRequest<PurchaseSuggestions>("/workspace/orders/suggestions");
export const recordPurchaseSuggestionDecision = (productId: string, input: {
  operationId: string; suggestionKey: string; decision: "added" | "excluded"; quantity?: number;
}) => apiRequest<{ id: string; operationId: string; decision: string; replayed: boolean }>(
  `/workspace/orders/suggestions/${encodeURIComponent(productId)}/decision`, {
    method: "POST", body: JSON.stringify(input),
  });
export const reconcilePurchaseReceipt = (orderId: string, input: PurchaseReceiptInput) => apiRequest<{
  id: string; orderId: string; invoiceReference: string; invoiceDocumentId: string; deliveryReference: string;
  deliveryDate: string; simulated: boolean; provenance: string; invoiceComplete: boolean; replayed: boolean;
}>(`/workspace/orders/${encodeURIComponent(orderId)}/receipts`, { method: "POST", body: JSON.stringify(input) });

export const updatePurchaseDelivery = (lineId: string, input: { operationId: string; expectedRevision: number; expectedDeliveryDate: string | null; note: string }) =>
  apiRequest<{ replayed: boolean }>(`/workspace/orders/lines/${encodeURIComponent(lineId)}/delivery`, { method: "PATCH", body: JSON.stringify(input) });

export interface PurchaseReconciliation {
  orderId: string;
  receipts: Array<{ receiptId: string; deliveryReference: string; deliveryDate: string; invoiceDocumentId: string; invoiceReference: string; invoiceComplete: boolean; simulated: boolean;
    credits: Array<{ id: string; reference: string; amount: number; reason: string }> }>;
  assumptions: string[];
}
export interface PurchaseCreditInput { operationId: string; receiptId: string; reference: string; amount: number; reason: string; }
export const getPurchaseReconciliation = (orderId: string, restaurantId: string) => apiRequest<PurchaseReconciliation>(
  `/workspace/orders/${encodeURIComponent(orderId)}/reconciliation`, { headers: { "X-Expected-Restaurant-Id": restaurantId } });
export const recordPurchaseCredit = (input: PurchaseCreditInput, restaurantId: string) =>
  apiRequest<{ id: string; replayed: boolean }>("/workspace/orders/credits", {
    method: "POST", headers: { "X-Expected-Restaurant-Id": restaurantId }, body: JSON.stringify(input),
  });
