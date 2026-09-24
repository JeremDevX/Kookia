import { apiRequest } from "../config/api";
export interface OrderLineInput { productId: string; quantity: number; predictionId?: string; cartId?: string; }
export interface PurchaseOrder {
  id: string; status: string; createdAt: string;
  lines: { productId: string; productName: string; supplierName: string; quantity: number; unit: string; pricePerUnit: number }[];
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
  estimatedQuantity: number | null;
  currentUnitPrice: number;
  estimatedCost: number | null;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
  reason: string;
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

export const getOrders = () => apiRequest<PurchaseOrder[]>("/workspace/orders");
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
