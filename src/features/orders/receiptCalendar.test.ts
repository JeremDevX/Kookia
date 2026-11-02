import { describe, expect, it } from "vitest";
import type { PurchaseOrder } from "../../services/orderService";
import { receiptEvents, shiftDays, shiftMonth, startOfWeek } from "./receiptCalendar";

describe("calendrier des réceptions", () => {
  it("calcule les périodes aux changements de mois et d’année", () => {
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(shiftDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(shiftMonth("2027-01-31", 1)).toBe("2027-02-01");
  });
  it("distingue les réceptions et les lignes attendues sans date", () => {
    const order = { id: "order", status: "partially_received", lines: [
      { supplierName: "A", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { supplierName: "A", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { supplierName: "B", remainingQuantity: 1, expectedDeliveryDate: null },
      { supplierName: "C", remainingQuantity: 0, expectedDeliveryDate: "2026-11-03" },
    ], receipts: [{ deliveryDate: "2026-11-01", deliveryReference: "BL-1", simulated: false }] } as PurchaseOrder;
    expect(receiptEvents([order])).toEqual({ undated: 1, events: [
      { date: "2026-11-02", orderId: "order", label: "A", kind: "expected", simulated: false },
      { date: "2026-11-01", orderId: "order", label: "BL-1", kind: "received", simulated: false },
    ] });
  });
});
