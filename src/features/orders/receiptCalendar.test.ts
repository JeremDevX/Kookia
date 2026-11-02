import { describe, expect, it } from "vitest";
import type { PurchaseOrder } from "../../services/orderService";
import { dateExceeded, isCalendarAnchor, receiptEventHref, receiptEvents, shiftDays, shiftMonth, startOfWeek } from "./receiptCalendar";

describe("calendrier des réceptions", () => {
  it("refuse une date invalide ou un mois dont la grille dépasse les dates représentables", () => {
    expect(isCalendarAnchor("2026-11-02")).toBe(true);
    expect(isCalendarAnchor("2026-02-30")).toBe(false);
    expect(isCalendarAnchor("9999-12-31")).toBe(false);
    expect(isCalendarAnchor("0000-01-01")).toBe(false);
  });
  it("ouvre le rapprochement pour une livraison attendue et la commande pour une réception enregistrée", () => {
    const event = { date: "2026-11-02", orderId: "order", label: "A", kind: "expected", simulated: false } as const;
    expect(receiptEventHref(event)).toBe("/orders?view=orders&action=receive#order-order");
    expect(receiptEventHref({ ...event, kind: "received" })).toBe("/orders?view=orders#order-order");
  });
  it("signale uniquement les dates prévues antérieures à aujourd’hui, y compris en simulation", () => {
    const event = { date: "2026-11-01", orderId: "order", label: "A", kind: "expected", simulated: true } as const;
    expect(dateExceeded(event, "2026-11-02")).toBe(true);
    expect(dateExceeded(event, "2026-11-01")).toBe(false);
    expect(dateExceeded({ ...event, kind: "received" }, "2026-11-02")).toBe(false);
  });
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
  it("filtre les lignes attendues et les réceptions par fournisseur, même sur une commande mixte", () => {
    const order = { id: "mixed", status: "partially_received", lines: [
      { id: "a", supplierId: "a", supplierName: "A", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { id: "b", supplierId: "b", supplierName: "B", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { id: "c", supplierId: "b", supplierName: "B", remainingQuantity: 1, expectedDeliveryDate: null },
    ], receipts: [{ deliveryDate: "2026-11-01", deliveryReference: "BL-A", simulated: false, lines: [{ orderLineId: "a", receivedQuantity: 1 }, { orderLineId: "b", receivedQuantity: 0 }] }] } as PurchaseOrder;
    expect(receiptEvents([order], "b")).toEqual({ undated: 1, events: [
      { date: "2026-11-02", orderId: "mixed", label: "B", kind: "expected", simulated: false },
    ] });
    expect(receiptEvents([order], "a").events.map((event) => event.label)).toEqual(["A", "BL-A"]);
  });
});
