import { apiRequest } from "../config/api";
export interface OrderLineInput { productId: string; quantity: number; predictionId?: string; cartId?: string; }
export interface PurchaseOrder {
  id: string; status: string; createdAt: string;
  lines: { id: string; productId: string; productName: string; supplierId: string; supplierName: string;
    quantity: number; receivedQuantity: number; remainingQuantity: number; unit: string; pricePerUnit: number }[];
  receipts: Array<{ id: string; invoiceReference: string; invoiceDocumentId: string; deliveryReference: string;
    deliveryDate: string; simulated: boolean; provenance: string; invoiceComplete: boolean;
    lines: Array<{ id: string; orderLineId: string; productId: string; productName: string;
      invoiceLineIndex: number; invoiceQuantity: number; receivedQuantity: number; quantityDifference: number; unit: string;
      stockMovementId: string | null;
      orderedUnitPrice: number; invoiceUnitPrice: number; priceDifferenceReason?: string }> }>;
}

export interface PurchaseReceiptLineEvidence {
  receiptLineId: string;
  productId: string;
  productName: string;
  deliveryReference: string;
  deliveryDate: string;
  receivedQuantity: number;
  unit: string;
}

export interface PurchaseSuggestion {
  suggestionKey: string;
  productId: string;
  productName: string;
  supplierName: string;
  unit: string;
  status: "ready" | "needs_stock_count" | "covered" | "unit_mismatch";
  canAdd: boolean;
  forecastNeed: number;
  countedStock: number | null;
  countDate: string | null;
  netNeed: number | null;
  orderStep: number;
  estimatedQuantity: number | null;
  currentUnitPrice: number;
  estimatedCost: number | null;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
  reason: string;
  decision: { kind: "added" | "excluded"; operationId: string; quantity: number | null; orderId: string | null } | null;
}

export interface PurchaseSuggestions {
  status: "ready" | "no_data" | "insufficient_history" | "simulation_only";
  provenance: "recorded_sales" | "demo_simulation" | "mixed";
  workspaceMode: "operational" | "demo";
  model: string;
  asOfDate: string;
  forecastDate: string;
  completeServiceDays: number;
  blockers: string[];
  suggestions: PurchaseSuggestion[];
  assumptions: string[];
}

export interface PurchaseReceiptInput {
  operationId: string;
  invoiceDocumentId: string;
  invoiceDocumentRevision: number;
  deliveryReference: string;
  deliveryDate: string;
  lines: Array<{ invoiceLineIndex: number; orderLineId: string; receivedQuantity: number; priceDifferenceReason?: string }>;
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
