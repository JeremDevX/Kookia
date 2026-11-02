import type { PurchaseOrder } from "../../services/orderService";

export function matchesSupplier(order: PurchaseOrder, supplierId: string): boolean {
  return !supplierId || order.lines.some((line) => line.supplierId === supplierId);
}
