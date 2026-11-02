import { describe, expect, it } from "vitest";
import type { CalendarService } from "../../../shared/serviceCalendar";
import type { PurchaseOrder } from "../../services/orderService";
import { serviceSchedule, todayReceipts } from "./todayPlanning";
import { formatLocalISODate } from "../../utils/date";

const service = { plannedOpen: false, exceptional: false, opensAt: null, closesAt: null } as CalendarService;
describe("planning du jour", () => {
  it("change de jour à minuit à Paris en hiver comme en été", () => {
    expect(formatLocalISODate(new Date("2026-11-02T22:59:59Z"))).toBe("2026-11-02");
    expect(formatLocalISODate(new Date("2026-11-02T23:00:00Z"))).toBe("2026-11-03");
    expect(formatLocalISODate(new Date("2026-07-02T21:59:59Z"))).toBe("2026-07-02");
    expect(formatLocalISODate(new Date("2026-07-02T22:00:00Z"))).toBe("2026-07-03");
  });
  it("distingue horaires absents, fermeture explicite et ouverture", () => {
    expect(serviceSchedule(service)).toBe("Horaires non renseignés");
    expect(serviceSchedule({ ...service, exceptional: true })).toBe("Fermé pour ce service");
    expect(serviceSchedule({ ...service, plannedOpen: true })).toBe("Ouvert, horaires non renseignés");
    expect(serviceSchedule({ ...service, plannedOpen: true, opensAt: "12:00", closesAt: "14:00" })).toBe("12:00 – 14:00");
  });
  it("retient les événements du jour et les livraisons dépassées sans attribuer les lignes non datées", () => {
    const line = { id: "line", productId: "product", supplierName: "Fournisseur", productName: "Farine", quantity: 2, receivedQuantity: 0, unit: "kg", pricePerUnit: 1 };
    const order: PurchaseOrder = { id: "1", status: "validated", createdAt: "2026-11-02", lines: [
      { ...line, supplierId: "a", remainingQuantity: 2, expectedDeliveryDate: "2026-11-02" },
      { ...line, supplierId: "b", remainingQuantity: 1, expectedDeliveryDate: null },
      { ...line, supplierId: "c", remainingQuantity: 1, expectedDeliveryDate: "2026-11-03" },
      { ...line, supplierId: "d", remainingQuantity: 1, expectedDeliveryDate: "2026-11-01" },
    ], receipts: [] };
    const result = todayReceipts([order], "2026-11-02");
    expect(result.undated).toBe(1);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({ date: "2026-11-01", kind: "expected" });
    expect(result.events[1]).toMatchObject({ kind: "expected", label: "Fournisseur", items: [{ name: "Farine", quantity: 2, unit: "kg" }] });
  });
  it("identifie les lignes sans date issues d’une simulation", () => {
    const line = { id: "line", productId: "product", supplierId: "supplier", supplierName: "Fournisseur", productName: "Farine", quantity: 2, receivedQuantity: 0, remainingQuantity: 2, unit: "kg", pricePerUnit: 1, expectedDeliveryDate: null };
    const order: PurchaseOrder = { id: "1", status: "simulated_validated", createdAt: "2026-11-02", lines: [line], receipts: [] };
    expect(todayReceipts([order], "2026-11-02")).toMatchObject({ undated: 1, simulatedUndated: 1, events: [] });
  });

});
