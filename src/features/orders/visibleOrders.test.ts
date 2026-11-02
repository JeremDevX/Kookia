import { expect, it } from "vitest";
import type { PurchaseOrder } from "../../services/orderService";
import { visibleOrders } from "./visibleOrders";

it("garde une commande épinglée visible hors filtre ou hors page sans la dupliquer", () => {
  const orders = Array.from({ length: 12 }, (_, index) => ({ id: String(index) }) as PurchaseOrder);
  expect(visibleOrders(orders, orders.slice(1), 0, undefined, ["0"]).map((order) => order.id))
    .toEqual(orders.slice(0, 11).map((order) => order.id));
  expect(visibleOrders(orders, orders, 1, orders[0], ["0"]).map((order) => order.id))
    .toEqual(["0", "10", "11"]);
  expect(visibleOrders(orders, orders, 1, undefined, []).map((order) => order.id))
    .toEqual(["10", "11"]);
});
