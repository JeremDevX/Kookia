import { expect, it } from "vitest";
import type { PurchaseOrder } from "../../services/orderService";
import { matchesSupplier } from "./supplierFilter";

it("filtre les commandes multi-fournisseurs sans perdre le choix tous", () => {
  const order = { lines: [{ supplierId: "a" }, { supplierId: "b" }] } as PurchaseOrder;
  expect(matchesSupplier(order, "")).toBe(true);
  expect(matchesSupplier(order, "b")).toBe(true);
  expect(matchesSupplier(order, "c")).toBe(false);
});
