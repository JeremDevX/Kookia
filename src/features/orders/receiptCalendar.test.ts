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
    const event = { date: "2026-11-02", orderId: "order", label: "A", kind: "expected" as const, simulated: false, items: [] };
    expect(receiptEventHref(event)).toBe("/orders?view=orders&action=receive#order-order");
    expect(receiptEventHref({ ...event, kind: "received", receiptId: "receipt-1" })).toBe("/orders?view=orders&receiptId=receipt-1#receipt-receipt-1");
  });
  it("signale uniquement les dates prévues antérieures à aujourd’hui, y compris en simulation", () => {
    const event = { date: "2026-11-01", orderId: "order", label: "A", kind: "expected" as const, simulated: true, items: [] };
    expect(dateExceeded(event, "2026-11-02")).toBe(true);
    expect(dateExceeded(event, "2026-11-01")).toBe(false);
    expect(dateExceeded({ ...event, kind: "received", receiptId: "receipt-1" }, "2026-11-02")).toBe(false);
  });
  it("calcule les périodes aux changements de mois et d’année", () => {
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(shiftDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(shiftMonth("2027-01-31", 1)).toBe("2027-02-01");
  });
  it("distingue les réceptions et les lignes attendues sans date", () => {
    const order = { id: "order", status: "partially_received", lines: [
      { supplierId: "a", supplierName: "A", productName: "Tomates", unit: "kg", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { supplierId: "a", supplierName: "A", productName: "Carottes", unit: "kg", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { supplierId: "b", supplierName: "B", remainingQuantity: 1, expectedDeliveryDate: null },
      { supplierId: "c", supplierName: "C", remainingQuantity: 0, expectedDeliveryDate: "2026-11-03" },
    ], receipts: [{ id: "receipt-1", deliveryDate: "2026-11-01", deliveryReference: "BL-1", simulated: false, lines: [{ productName: "Tomates", receivedQuantity: 2, unit: "kg" }] }] } as PurchaseOrder;
    expect(receiptEvents([order])).toEqual({ undated: 1, events: [
      { date: "2026-11-02", orderId: "order", label: "A", items: [{ name: "Tomates", quantity: 1, unit: "kg" }, { name: "Carottes", quantity: 1, unit: "kg" }], kind: "expected", simulated: false },
      { date: "2026-11-01", orderId: "order", receiptId: "receipt-1", label: "BL-1", items: [{ name: "Tomates", quantity: 2, unit: "kg" }], kind: "received", simulated: false },
    ] });
  });
  it("filtre les lignes attendues et les réceptions par fournisseur, même sur une commande mixte", () => {
    const order = { id: "mixed", status: "partially_received", lines: [
      { id: "a", supplierId: "a", supplierName: "A", productName: "Tomates", unit: "kg", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { id: "b", supplierId: "b", supplierName: "B", productName: "Lait", unit: "L", remainingQuantity: 1, expectedDeliveryDate: "2026-11-02" },
      { id: "c", supplierId: "b", supplierName: "B", remainingQuantity: 1, expectedDeliveryDate: null },
    ], receipts: [{ id: "receipt-a", deliveryDate: "2026-11-01", deliveryReference: "BL-A", simulated: false, lines: [{ orderLineId: "a", productName: "Tomates", unit: "kg", receivedQuantity: 1 }, { orderLineId: "b", productName: "Lait", unit: "L", receivedQuantity: 0 }] }] } as PurchaseOrder;
    expect(receiptEvents([order], "b")).toEqual({ undated: 1, events: [
      { date: "2026-11-02", orderId: "mixed", label: "B", items: [{ name: "Lait", quantity: 1, unit: "L" }], kind: "expected", simulated: false },
    ] });
    expect(receiptEvents([order], "a").events.map((event) => event.label)).toEqual(["A", "BL-A"]);
    expect(receiptEvents([order]).events.filter((event) => event.kind === "expected").map((event) => [event.label, event.items])).toEqual([
      ["A", [{ name: "Tomates", quantity: 1, unit: "kg" }]], ["B", [{ name: "Lait", quantity: 1, unit: "L" }]],
    ]);
  });
  it("distingue deux réceptions portant la même référence", () => {
    const receipt = { invoiceReference: "FACT", invoiceDocumentId: "invoice", deliveryDate: "2026-11-02", deliveryReference: "BL", simulated: false, provenance: "recorded", invoiceComplete: false, lines: [] };
    const order: PurchaseOrder = { id: "order", status: "partially_received", createdAt: "2026-11-02", lines: [], receipts: [
      { ...receipt, id: "r1" }, { ...receipt, id: "r2" },
    ] };
    expect(receiptEvents([order]).events.map(receiptEventHref)).toEqual([
      "/orders?view=orders&receiptId=r1#receipt-r1", "/orders?view=orders&receiptId=r2#receipt-r2",
    ]);
  });
  it("limite le contenu d’un bon mixte au fournisseur choisi et aux quantités reçues", () => {
    const order = { id: "mixed", status: "partially_received", lines: [
      { id: "a", supplierId: "a", remainingQuantity: 0 }, { id: "b", supplierId: "b", remainingQuantity: 0 },
    ], receipts: [{ id: "r1", deliveryDate: "2026-11-02", deliveryReference: "BL", simulated: false, lines: [
      { orderLineId: "a", productName: "Tomates", receivedQuantity: 2, unit: "kg" },
      { orderLineId: "b", productName: "Lait", receivedQuantity: 3, unit: "L" },
      { orderLineId: "b", productName: "Crème", receivedQuantity: 0, unit: "L" },
    ] }] } as PurchaseOrder;
    expect(receiptEvents([order], "b").events[0].items).toEqual([{ name: "Lait", quantity: 3, unit: "L" }]);
    expect(receiptEvents([order]).events[0].items).toEqual([
      { name: "Tomates", quantity: 2, unit: "kg" }, { name: "Lait", quantity: 3, unit: "L" },
    ]);
  });
});
