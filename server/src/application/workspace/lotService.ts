import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export function fefoOrder<T extends { id: string; expiresAt: Date | null; receivedAt: Date | null }>(lots: T[]): T[] {
  return [...lots].sort((a, b) => (a.expiresAt?.getTime() ?? Infinity) - (b.expiresAt?.getTime() ?? Infinity)
    || (a.receivedAt?.getTime() ?? Infinity) - (b.receivedAt?.getTime() ?? Infinity) || a.id.localeCompare(b.id));
}

export async function recordLotMovement(tx: Prisma.TransactionClient, restaurantId: string, productId: string,
  stockBefore: Prisma.Decimal, movement: { id: string; delta: Prisma.Decimal }, actorId: string,
  receipt?: { lineId: string; receivedAt: Date; expiresAt?: Date | null; unitCost: Prisma.Decimal }, selectedLotId?: string, usageDate?: Date) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId} AND id = ${productId} FOR UPDATE`);
  const lots = await tx.stockLot.findMany({ where: { restaurantId, productId, remainingQuantity: { gt: 0 } } });
  const tracked = lots.reduce((sum, lot) => sum.plus(lot.remainingQuantity), new Prisma.Decimal(0));
  if (tracked.greaterThan(stockBefore)) throw new WorkspaceError(409, "LOT_STOCK_MISMATCH", "Les lots ne correspondent plus au stock ; un rapprochement est nécessaire.");
  if (tracked.lessThan(stockBefore)) {
    const missing = stockBefore.minus(tracked);
    lots.push(await tx.stockLot.create({ data: { restaurantId, productId, source: "unaged", actorId,
      quantityReceived: missing, remainingQuantity: missing, receivedAt: null, expiresAt: null, unitCost: null } }));
  }
  if (movement.delta.greaterThan(0)) {
    await tx.stockLot.create({ data: { restaurantId, productId, actorId, source: receipt ? "receipt" : "unaged",
      purchaseReceiptLineId: receipt?.lineId ?? null, receivedAt: receipt?.receivedAt ?? null,
      expiresAt: receipt?.expiresAt ?? null, unitCost: receipt?.unitCost ?? null,
      quantityReceived: movement.delta, remainingQuantity: movement.delta } });
    return;
  }
  let needed = movement.delta.negated();
  const eligible = usageDate ? lots.filter((lot) => !lot.expiresAt || lot.expiresAt >= usageDate) : lots;
  const candidates = selectedLotId ? eligible.filter((lot) => lot.id === selectedLotId) : fefoOrder(eligible);
  if (selectedLotId && !candidates.length) throw new WorkspaceError(400, "INVALID_LOT", "Le lot doit appartenir au produit et à votre espace et être disponible.");
  for (const lot of candidates) {
    if (!needed.greaterThan(0)) break;
    const quantity = Prisma.Decimal.min(needed, lot.remainingQuantity);
    const changed = await tx.stockLot.updateMany({ where: { restaurantId, id: lot.id, remainingQuantity: { gte: quantity } },
      data: { remainingQuantity: { decrement: quantity } } });
    if (!changed.count) throw new WorkspaceError(409, "LOT_CHANGED", "Le lot a changé ; rechargez le stock.");
    await tx.stockLotAllocation.create({ data: { restaurantId, lotId: lot.id, stockMovementId: movement.id, quantity } });
    needed = needed.minus(quantity);
  }
  if (needed.greaterThan(0)) throw new WorkspaceError(409, "INSUFFICIENT_LOT_STOCK", usageDate ? "Les lots utilisables à cette date sont insuffisants ; les lots à échéance dépassée ne sont pas proposés." : "La quantité disponible dans les lots est insuffisante.");
}

export async function listStockLots(restaurantId: string, productId?: string) {
  const [lots, products] = await Promise.all([
    prisma.stockLot.findMany({ where: { restaurantId, ...(productId ? { productId } : {}) }, include: { allocations: true } }),
    prisma.product.findMany({ where: { restaurantId, ...(productId ? { id: productId } : {}) }, select: { id: true, name: true, unit: true, currentStock: true } }),
  ]);
  const rows = fefoOrder(lots).map((lot) => ({ id: lot.id, productId: lot.productId, source: lot.source,
    purchaseReceiptLineId: lot.purchaseReceiptLineId, receivedAt: lot.receivedAt?.toISOString().slice(0, 10) ?? null,
    expiresAt: lot.expiresAt?.toISOString().slice(0, 10) ?? null, quantityReceived: Number(lot.quantityReceived),
    remainingQuantity: Number(lot.remainingQuantity), unitCost: lot.unitCost == null ? null : Number(lot.unitCost),
    allocations: lot.allocations.map((entry) => ({ stockMovementId: entry.stockMovementId, quantity: Number(entry.quantity) })) }));
  return { lots: rows, unagedStock: products.map((product) => ({ productId: product.id, productName: product.name, unit: product.unit,
    quantity: Math.max(0, Number(product.currentStock) - rows.filter((lot) => lot.productId === product.id).reduce((sum, lot) => sum + lot.remainingQuantity, 0)) })).filter((entry) => entry.quantity > 0) };
}
