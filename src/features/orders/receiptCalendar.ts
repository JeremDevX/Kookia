import type { PurchaseOrder } from "../../services/orderService";
import { isValidISODate } from "../../utils/date";

export type ReceiptEvent = { date: string; orderId: string; label: string; kind: "expected" | "received"; simulated: boolean };
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
    const pending = new Map<string, Set<string>>();
    for (const line of order.lines) {
      if (line.remainingQuantity <= 0 || (supplierId && line.supplierId !== supplierId)) continue;
      if (!isValidISODate(line.expectedDeliveryDate ?? null)) { undated++; continue; }
      const suppliers = pending.get(line.expectedDeliveryDate!) ?? new Set<string>();
      suppliers.add(line.supplierName);
      pending.set(line.expectedDeliveryDate!, suppliers);
    }
    for (const [date, suppliers] of pending) events.push({ date, orderId: order.id, label: [...suppliers].join(" · "), kind: "expected", simulated: order.status.startsWith("simulated") });
    for (const receipt of order.receipts) {
      if (!isValidISODate(receipt.deliveryDate)) continue;
      if (supplierId && !receipt.lines.some((receiptLine) => receiptLine.receivedQuantity > 0 && order.lines.some((line) => line.id === receiptLine.orderLineId && line.supplierId === supplierId))) continue;
      events.push({ date: receipt.deliveryDate, orderId: order.id, label: receipt.deliveryReference, kind: "received", simulated: receipt.simulated });
    }
  }
  return { events, undated };
}
