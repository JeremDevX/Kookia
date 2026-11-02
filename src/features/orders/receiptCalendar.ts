import type { PurchaseOrder } from "../../services/orderService";
import { isValidISODate } from "../../utils/date";

export type ReceiptEvent = { date: string; orderId: string; label: string; simulated: boolean; items: Array<{ name: string; quantity: number; unit: string }> } &
  ({ kind: "expected" } | { kind: "received"; receiptId: string });
export const receiptEventHref = (event: ReceiptEvent) => event.kind === "expected"
  ? `/orders?view=orders&action=receive#order-${encodeURIComponent(event.orderId)}`
  : `/orders?view=orders&receiptId=${encodeURIComponent(event.receiptId)}#receipt-${encodeURIComponent(event.receiptId)}`;
export const dateExceeded = (event: ReceiptEvent, today: string) => event.kind === "expected" && event.date < today;
const dateFromISO = (date: string) => new Date(`${date}T12:00:00Z`);
const isoFromDate = (date: Date) => date.toISOString().slice(0, 10);

export function shiftDays(date: string, days: number): string {
  const value = dateFromISO(date);
  value.setUTCDate(value.getUTCDate() + days);
  return isoFromDate(value);
}

export function startOfWeek(date: string): string {
  return shiftDays(date, -((dateFromISO(date).getUTCDay() + 6) % 7));
}

export function isCalendarAnchor(date: string | null): date is string {
  if (!isValidISODate(date)) return false;
  const start = startOfWeek(`${date.slice(0, 7)}-01`);
  return isValidISODate(start) && isValidISODate(shiftDays(start, 41));
}

export function shiftMonth(date: string, months: number): string {
  const value = dateFromISO(date);
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  return isoFromDate(value);
}

export function receiptEvents(orders: PurchaseOrder[], supplierId = ""): { events: ReceiptEvent[]; undated: number } {
  const events: ReceiptEvent[] = [];
  let undated = 0;
  for (const order of orders) {
    const pending = new Map<string, Map<string, { name: string; items: ReceiptEvent["items"] }>>();
    for (const line of order.lines) {
      if (line.remainingQuantity <= 0 || (supplierId && line.supplierId !== supplierId)) continue;
      if (!isValidISODate(line.expectedDeliveryDate ?? null)) { undated++; continue; }
      const suppliers = pending.get(line.expectedDeliveryDate!) ?? new Map();
      const group = suppliers.get(line.supplierId) ?? { name: line.supplierName, items: [] };
      group.items.push({ name: line.productName, quantity: line.remainingQuantity, unit: line.unit });
      suppliers.set(line.supplierId, group);
      pending.set(line.expectedDeliveryDate!, suppliers);
    }
    for (const [date, suppliers] of pending) for (const group of suppliers.values()) events.push({ date, orderId: order.id, label: group.name, items: group.items, kind: "expected", simulated: order.status.startsWith("simulated") });
    for (const receipt of order.receipts) {
      if (!isValidISODate(receipt.deliveryDate)) continue;
      const lines = receipt.lines.filter((receiptLine) => receiptLine.receivedQuantity > 0 && (!supplierId || order.lines.some((line) => line.id === receiptLine.orderLineId && line.supplierId === supplierId)));
      if (supplierId && lines.length === 0) continue;
      const items = lines.map((line) => ({ name: line.productName, quantity: line.receivedQuantity, unit: line.unit }));
      events.push({ date: receipt.deliveryDate, orderId: order.id, receiptId: receipt.id, label: receipt.deliveryReference, items, kind: "received", simulated: receipt.simulated });
    }
  }
  return { events, undated };
}
