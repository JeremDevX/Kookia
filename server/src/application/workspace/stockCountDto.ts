import type { StockCount } from "@prisma/client";

export const stockCountDto = (count: StockCount) => ({
  id: count.id,
  productId: count.productId,
  countedQuantity: Number(count.countedQuantity),
  theoreticalQuantity: Number(count.theoreticalQuantity),
  delta: Number(count.delta),
  unit: count.unit,
  stockRevisionBefore: count.stockRevisionBefore,
  stockRevisionAfter: count.stockRevisionAfter,
  operationId: count.operationId,
  actorId: count.actorId,
  countDate: count.countDate.toISOString().slice(0, 10),
  countedAt: count.countedAt.toISOString(),
});
