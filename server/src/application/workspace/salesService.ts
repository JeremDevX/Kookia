import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export interface SaleValues { saleItemId: string; serviceDate: string; quantity: number }

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const saleDto = (sale: Prisma.DailySaleGetPayload<{ include: { saleItem: true } }>) => ({
  id: sale.id, saleItemId: sale.saleItemId, saleItemName: sale.saleItem.name,
  serviceDate: sale.serviceDate.toISOString().slice(0, 10),
  quantity: sale.quantity, source: sale.source, revision: sale.revision,
  createdBy: sale.createdBy, updatedBy: sale.updatedBy,
  createdAt: sale.createdAt.toISOString(), updatedAt: sale.updatedAt.toISOString(),
});

export async function listSaleItems(restaurantId: string) {
  return prisma.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function createSaleItem(restaurantId: string, name: string) {
  try {
    const item = await prisma.saleItem.create({ data: { restaurantId, name, normalizedName: name.toLocaleLowerCase("fr-FR") } });
    return { id: item.id, name: item.name };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new WorkspaceError(409, "ITEM_CONFLICT", "Cet article vendu existe déjà.");
    throw error;
  }
}

async function assertSaleItem(restaurantId: string, saleItemId: string) {
  const item = await prisma.saleItem.findUnique({ where: { restaurantId_id: { restaurantId, id: saleItemId } } });
  if (!item) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "Article vendu introuvable dans votre espace.");
}

export async function listSales(restaurantId: string, from: string, to: string) {
  const rows = await prisma.dailySale.findMany({
    where: { restaurantId, serviceDate: { gte: date(from), lte: date(to) } },
    include: { saleItem: true }, orderBy: [{ serviceDate: "desc" }, { saleItem: { name: "asc" } }],
  });
  return rows.map(saleDto);
}

export async function latestService(restaurantId: string) {
  const latest = await prisma.dailySale.findFirst({ where: { restaurantId }, orderBy: { serviceDate: "desc" }, select: { serviceDate: true } });
  if (!latest) return null;
  const sources = await prisma.dailySale.findMany({ where: { restaurantId, serviceDate: latest.serviceDate }, distinct: ["source"], select: { source: true } });
  return { serviceDate: latest.serviceDate.toISOString().slice(0, 10), sources: sources.map((row) => row.source) };
}

export async function createSale(restaurantId: string, actorId: string, operationId: string, input: SaleValues) {
  const prior = await prisma.dailySale.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } }, include: { saleItem: true } });
  if (prior) {
    if (prior.saleItemId === input.saleItemId && prior.serviceDate.getTime() === date(input.serviceDate).getTime() && prior.quantity === input.quantity) return saleDto(prior);
    throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération correspond déjà à une autre vente.");
  }
  await assertSaleItem(restaurantId, input.saleItemId);
  try {
    const sale = await prisma.dailySale.create({ data: {
      restaurantId, saleItemId: input.saleItemId, serviceDate: date(input.serviceDate),
      quantity: input.quantity, source: "manual", operationId, createdBy: actorId, updatedBy: actorId,
    }, include: { saleItem: true } });
    return saleDto(sale);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const retry = await prisma.dailySale.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } }, include: { saleItem: true } });
      if (retry && retry.saleItemId === input.saleItemId && retry.serviceDate.getTime() === date(input.serviceDate).getTime() && retry.quantity === input.quantity) return saleDto(retry);
      throw new WorkspaceError(409, "SALE_CONFLICT", "Une vente existe déjà pour cet article et cette date ; corrigez-la dans l’historique.");
    }
    throw error;
  }
}

export async function correctSale(restaurantId: string, actorId: string, id: string, revision: number, input: SaleValues) {
  await assertSaleItem(restaurantId, input.saleItemId);
  try {
    const updated = await prisma.dailySale.updateMany({
      where: { id, restaurantId, revision },
      data: { saleItemId: input.saleItemId, serviceDate: date(input.serviceDate), quantity: input.quantity,
        updatedBy: actorId, revision: { increment: 1 } },
    });
    if (!updated.count) {
      const existing = await prisma.dailySale.findFirst({ where: { id, restaurantId }, select: { id: true } });
      throw new WorkspaceError(existing ? 409 : 404, existing ? "REVISION_CONFLICT" : "NOT_FOUND",
        existing ? "Cette vente a changé ; rechargez l’historique avant correction." : "Vente introuvable.");
    }
    return saleDto(await prisma.dailySale.findFirstOrThrow({ where: { id, restaurantId }, include: { saleItem: true } }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new WorkspaceError(409, "SALE_CONFLICT", "Une vente existe déjà pour cet article et cette date.");
    throw error;
  }
}
