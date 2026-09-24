import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { stockCountDto } from "./stockCountDto.js";

export class WorkspaceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}

export const productDto = (product: Awaited<ReturnType<typeof prisma.product.findMany>>[number]) => ({
  id: product.id, name: product.name, category: product.category, unit: product.unit,
  currentStock: Number(product.currentStock), minThreshold: Number(product.minThreshold),
  supplierId: product.supplierId, pricePerUnit: Number(product.pricePerUnit),
  revision: product.revision, stockRevision: product.stockRevision,
  ...(product.lastDelivery ? { lastDelivery: product.lastDelivery.toISOString().slice(0, 10) } : {}),
});

export async function getCatalog(restaurantId: string) {
  const [products, suppliers] = await prisma.$transaction([
    prisma.product.findMany({ where: { restaurantId }, orderBy: { id: "asc" }, include: {
      stockCounts: { orderBy: [{ countedAt: "desc" }, { id: "desc" }], take: 1 },
    } }),
    prisma.supplier.findMany({ where: { restaurantId }, orderBy: { id: "asc" } }),
  ]);
  return { products: products.map(({ stockCounts, ...product }) => ({
    ...productDto(product), latestCount: stockCounts[0] ? stockCountDto(stockCounts[0]) : null,
  })), suppliers: suppliers.map(({ id, name, email, phone }) => ({ id, name, email, phone })) };
}

interface NewProductInput {
  name: string; category: string; currentStock: number; unit: string;
  minThreshold: number; supplierId: string; pricePerUnit: number;
}

export async function createProduct(restaurantId: string, actorId: string, data: NewProductInput, operationId: string) {
  return prisma.$transaction(async (tx) => {
    const prior = await tx.stockMovement.findFirst({ where: { restaurantId, operationId } });
    if (prior) return productDto(await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: prior.productId } } }));
    const supplier = await tx.supplier.findUnique({ where: { restaurantId_id: { restaurantId, id: data.supplierId } } });
    if (!supplier) throw new WorkspaceError(400, "INVALID_SUPPLIER", "Fournisseur introuvable dans votre espace.");
    const product = await tx.product.create({ data: { ...data, id: operationId, restaurantId } });
    await tx.stockMovement.create({ data: { restaurantId, productId: product.id, actorId, operationId, delta: data.currentStock,
      reason: "initial", productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: supplier.name } });
    return productDto(product);
  });
}

interface EditProductInput {
  expectedRevision: number; name: string; category: string;
  minThreshold: number; supplierId: string; pricePerUnit: number;
}

export async function editProduct(restaurantId: string, productId: string, data: EditProductInput) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { restaurantId_id: { restaurantId, id: data.supplierId } } });
    if (!supplier) throw new WorkspaceError(400, "INVALID_SUPPLIER", "Fournisseur introuvable dans votre espace.");
    const updated = await tx.product.updateMany({
      where: { restaurantId, id: productId, revision: data.expectedRevision },
      data: {
        name: data.name, category: data.category, minThreshold: data.minThreshold,
        supplierId: data.supplierId, pricePerUnit: data.pricePerUnit, revision: { increment: 1 },
      },
    });
    if (!updated.count) {
      const exists = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: productId } }, select: { id: true } });
      if (!exists) throw new WorkspaceError(404, "NOT_FOUND", "Produit introuvable.");
      throw new WorkspaceError(409, "REVISION_CONFLICT", "La fiche produit a changé. Rechargez-la avant de réessayer.");
    }
    return productDto(await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: productId } } }));
  });
}

export async function adjustStock(restaurantId: string, actorId: string, productId: string, delta: number, operationId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize mutations of the same product; the idempotency lookup occurs after the lock.
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId} AND id = ${productId} FOR UPDATE`);
    if (!locked.length) throw new WorkspaceError(404, "NOT_FOUND", "Produit introuvable.");
    const prior = await tx.stockMovement.findUnique({ where: { restaurantId_operationId_productId: { restaurantId, operationId, productId } } });
    if (!prior) {
      const updated = await tx.product.updateMany({ where: {
        restaurantId, id: productId, ...(delta < 0 ? { currentStock: { gte: -delta } } : {}),
      }, data: { currentStock: { increment: delta }, stockRevision: { increment: 1 } } });
      if (!updated.count) throw new WorkspaceError(409, "INSUFFICIENT_STOCK", "Le stock disponible est insuffisant.");
      const product = await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: productId } },
        include: { supplier: { select: { name: true } } } });
      await tx.stockMovement.create({ data: { restaurantId, productId, delta, reason, operationId, actorId,
        productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: product.supplier.name } });
    } else if (!prior.delta.equals(delta) || prior.reason !== reason) {
      throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération a déjà été utilisée avec d’autres valeurs.");
    }
    return productDto(await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: productId } } }));
  });
}
