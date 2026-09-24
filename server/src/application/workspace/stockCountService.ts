import { Prisma, type StockCount } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { productDto } from "./catalogService.js";
import { stockCountDto } from "./stockCountDto.js";

export interface StockCountInput {
  operationId: string;
  expectedStockRevision: number;
  expectedUnit: string;
  countedQuantity: number;
}

const parisServiceDate = () => new Date(`${new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date())}T00:00:00.000Z`);

export async function recordStockCount(restaurantId: string, actorId: string, productId: string, input: StockCountInput) {
  return prisma.$transaction(async (tx) => {
    // Serialize operation keys within a workspace, then lock the stock row before comparing its version.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const locked = await tx.$queryRaw<{ id: string; name: string; supplierId: string; currentStock: Prisma.Decimal; unit: string; stockRevision: number }[]>(
      Prisma.sql`SELECT id, name, "supplierId", "currentStock", unit, "stockRevision" FROM "Product" WHERE "restaurantId" = ${restaurantId} AND id = ${productId} FOR UPDATE`,
    );
    const product = locked[0];
    if (!product) throw new WorkspaceError(404, "NOT_FOUND", "Produit introuvable.");
    const response = async (count: StockCount) => {
      const [currentProduct, latestCount] = await Promise.all([
        tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: productId } } }),
        tx.stockCount.findFirst({ where: { restaurantId, productId }, orderBy: [{ countedAt: "desc" }, { id: "desc" }] }),
      ]);
      return { product: productDto(currentProduct), count: stockCountDto(count), latestCount: latestCount ? stockCountDto(latestCount) : null };
    };

    const prior = await tx.stockCount.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    if (prior) {
      if (prior.productId !== productId || prior.stockRevisionBefore !== input.expectedStockRevision || prior.unit !== input.expectedUnit ||
          !prior.countedQuantity.equals(new Prisma.Decimal(input.countedQuantity))) {
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de comptage a déjà été utilisée avec d’autres valeurs.");
      }
      return response(prior);
    }
    if (product.stockRevision !== input.expectedStockRevision || product.unit !== input.expectedUnit) {
      throw new WorkspaceError(409, "STOCK_CHANGED", "Le stock ou son unité a changé depuis l’ouverture du comptage. Rechargez la fiche.");
    }

    const countedQuantity = new Prisma.Decimal(input.countedQuantity);
    const delta = countedQuantity.minus(product.currentStock);
    const stockRevisionAfter = product.stockRevision + (delta.isZero() ? 0 : 1);
    const count = await tx.stockCount.create({ data: {
      id: input.operationId, restaurantId, productId, countedQuantity, theoreticalQuantity: product.currentStock,
      delta, unit: product.unit, stockRevisionBefore: product.stockRevision, stockRevisionAfter,
      operationId: input.operationId, actorId, countDate: parisServiceDate(),
    } });
    if (!delta.isZero()) {
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.supplierId } },
        select: { name: true } });
      const updated = await tx.product.updateMany({
        where: { restaurantId, id: productId, stockRevision: input.expectedStockRevision },
        data: { currentStock: { increment: delta }, stockRevision: { increment: 1 } },
      });
      if (!updated.count) throw new WorkspaceError(409, "STOCK_CHANGED", "Le stock a changé pendant le comptage. Rechargez la fiche.");
      await tx.stockMovement.create({ data: {
        restaurantId, productId, stockCountId: count.id, delta, reason: "stock_count",
        operationId: `stock-count:${input.operationId}`, actorId,
        productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: supplier.name,
      } });
    }
    return response(count);
  });
}

export async function getStockCounts(restaurantId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { restaurantId_id: { restaurantId, id: productId } }, select: { id: true } });
  if (!product) throw new WorkspaceError(404, "NOT_FOUND", "Produit introuvable.");
  const counts = await prisma.stockCount.findMany({ where: { restaurantId, productId }, orderBy: [{ countedAt: "desc" }, { id: "desc" }], take: 100 });
  return counts.map(stockCountDto);
}
