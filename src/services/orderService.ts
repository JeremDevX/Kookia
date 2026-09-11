import { apiRequest } from "../config/api";
export interface OrderLineInput { productId: string; quantity: number; predictionId?: string; cartId?: string; }
export interface PurchaseOrder {
  id: string; status: string; createdAt: string;
  lines: { productId: string; productName: string; supplierName: string; quantity: number; unit: string; pricePerUnit: number }[];
}
export const getOrders = () => apiRequest<PurchaseOrder[]>("/workspace/orders");
export const validateOrder = (operationId: string, lines: OrderLineInput[]) => apiRequest<PurchaseOrder>("/workspace/orders", {
  method: "POST", body: JSON.stringify({ operationId, lines }),
});
