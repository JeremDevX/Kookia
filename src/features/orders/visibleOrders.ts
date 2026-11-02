import type { PurchaseOrder } from "../../services/orderService";

export function visibleOrders(orders: PurchaseOrder[], filtered: PurchaseOrder[], page: number,
  target: PurchaseOrder | undefined, pinned: string[]) {
  const visible = filtered.slice(page * 10, (page + 1) * 10);
  if (target && !visible.some((order) => order.id === target.id)) visible.unshift(target);
  for (const order of orders) {
    if (pinned.includes(order.id) && !visible.some((item) => item.id === order.id)) visible.unshift(order);
  }
  return visible;
}
