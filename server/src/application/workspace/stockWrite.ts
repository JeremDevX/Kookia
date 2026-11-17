import type { Prisma } from "@prisma/client";
import { recordLotMovement, type LotMovementOptions } from "./lotService.js";
import { WorkspaceError } from "./workspaceError.js";

export type StockMovementInput = Prisma.StockMovementUncheckedCreateInput & { delta: Prisma.Decimal.Value };

export async function recordStockMovement(tx: Prisma.TransactionClient, data: StockMovementInput,
  stockBefore: Prisma.Decimal, lots?: LotMovementOptions) {
  const movement = await tx.stockMovement.create({ data });
  await recordLotMovement(tx, data.restaurantId, data.productId, stockBefore, movement, data.actorId, lots);
  return movement;
}

interface StockWriteOptions {
  stockBefore?: Prisma.Decimal;
  lastDelivery?: Date;
  condition?: { where: Pick<Prisma.ProductWhereInput, "stockRevision" | "currentStock">; error: WorkspaceError };
  lots?: LotMovementOptions;
}

export async function applyStockMovement(tx: Prisma.TransactionClient, data: StockMovementInput,
  { stockBefore, lastDelivery, condition, lots }: StockWriteOptions = {}) {
  const { restaurantId, productId, delta } = data;
  const [product] = await tx.product.updateManyAndReturn({
    where: { restaurantId, id: productId, ...condition?.where },
    data: { currentStock: { increment: delta }, stockRevision: { increment: 1 }, lastDelivery },
    select: { currentStock: true },
  });
  if (!product) throw condition?.error ?? new WorkspaceError(404, "NOT_FOUND", "Produit introuvable.");
  return recordStockMovement(tx, data, stockBefore ?? product.currentStock.minus(delta), lots);
}
