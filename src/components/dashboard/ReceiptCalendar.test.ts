import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { PurchaseOrder } from "../../services/orderService";
import ReceiptCalendar from "./ReceiptCalendar";

afterEach(() => vi.useRealTimers());
it("résume les réceptions de la semaine et conserve les liens vers les détails", () => {
  vi.useFakeTimers().setSystemTime(new Date("2026-11-04T12:00:00"));
  const orders = [{ id: "commande", createdAt: "2026-11-01", status: "partially_received", lines: [
    { supplierId: "a", supplierName: "A", productName: "Tomates", unit: "kg", remainingQuantity: 2, expectedDeliveryDate: "2026-11-03" },
    { supplierId: "a", supplierName: "A", productName: "Lait", unit: "L", remainingQuantity: 1, expectedDeliveryDate: "2026-11-05" },
    { supplierId: "a", supplierName: "A", productName: "Farine", unit: "kg", remainingQuantity: 1, expectedDeliveryDate: "2026-11-12" },
  ], receipts: [{ id: "reception", deliveryDate: "2026-11-04", deliveryReference: "BL-1", simulated: false, lines: [] }] }] as unknown as PurchaseOrder[];
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/orders?view=receipts"] }, createElement(ReceiptCalendar, { orders })));
  expect(html).toContain("1 à recevoir");
  expect(html).toContain("1 réception enregistrée");
  expect(html).toContain("1 date prévue dépassée");
  expect(html).toContain("action=receive#order-commande");
  expect(html).toContain("receiptId=reception#receipt-reception");
});
