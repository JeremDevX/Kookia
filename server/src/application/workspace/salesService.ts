import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { createSaleContribution, lockSalesWorkspace, recordSaleContributionEvent } from "./salesContributionLedger.js";

export interface SaleValues { saleItemId: string; serviceDate: string; quantity: number }

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const serviceDayWhere = (restaurantId: string, serviceDate: string) => ({ restaurantId_serviceDate: { restaurantId, serviceDate: date(serviceDate) } });
const saleDto = (sale: Prisma.DailySaleGetPayload<{ include: { saleItem: true } }>) => ({
  id: sale.id, saleItemId: sale.saleItemId, saleItemName: sale.saleItem.name,
  serviceDate: sale.serviceDate.toISOString().slice(0, 10),
  quantity: sale.quantity, source: sale.source, revision: sale.revision,
  createdBy: sale.createdBy, updatedBy: sale.updatedBy,
  createdAt: sale.createdAt.toISOString(), updatedAt: sale.updatedAt.toISOString(),
});
const serviceDayDto = (day: Prisma.ServiceDayGetPayload<{ include: { _count: { select: { sales: true } } } }>) => ({
  serviceDate: day.serviceDate.toISOString().slice(0, 10), status: day.status, coverage: day.coverage, source: day.source,
  revision: day.revision, actorId: day.actorId, salesCount: day._count.sales, updatedAt: day.updatedAt.toISOString(),
});

export async function listServiceDays(restaurantId: string, from: string, to: string) {
  const rows = await prisma.serviceDay.findMany({ where: { restaurantId, serviceDate: { gte: date(from), lte: date(to) } },
    include: { _count: { select: { sales: true } } }, orderBy: { serviceDate: "desc" } });
  return rows.map(serviceDayDto);
}

export async function saveServiceDay(restaurantId: string, actorId: string, serviceDate: string,
  expectedRevision: number, status: "open" | "closed", coverage: "complete" | "partial" | "missing") {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const where = serviceDayWhere(restaurantId, serviceDate);
    const current = await tx.serviceDay.findUnique({ where });
    const salesCount = await tx.dailySale.count({ where: { restaurantId, serviceDate: date(serviceDate) } });
    if (current ? current.revision !== expectedRevision : expectedRevision !== 0) {
      throw new WorkspaceError(409, "REVISION_CONFLICT", "L’état de ce service a changé. Rechargez le calendrier.");
    }
    if (status === "closed" && salesCount > 0) throw new WorkspaceError(409, "DAY_HAS_SALES", "Ce jour contient des ventes ; il ne peut pas être déclaré fermé.");
    if (status === "open" && coverage === "missing" && salesCount > 0) {
      throw new WorkspaceError(409, "DAY_HAS_SALES", "Ce jour contient déjà des ventes ; choisissez une couverture partielle ou complète.");
    }
    if (status === "closed" && coverage !== "complete") throw new WorkspaceError(400, "INVALID_SERVICE_DAY", "Un jour fermé doit être confirmé comme complet.");
    if (current) {
      await tx.serviceDay.update({ where, data: { status, coverage, actorId, revision: { increment: 1 } } });
    } else {
      await tx.serviceDay.create({ data: { restaurantId, serviceDate: date(serviceDate), status, coverage, actorId, revision: 1 } });
    }
    return serviceDayDto(await tx.serviceDay.findUniqueOrThrow({ where, include: { _count: { select: { sales: true } } } }));
  });
}

export async function ensureOpenPartialServiceDay(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  serviceDate: string, source: "recorded" | "demo_simulation" = "recorded") {
  const where = serviceDayWhere(restaurantId, serviceDate);
  const current = await tx.serviceDay.findUnique({ where });
  if (current?.status === "closed") throw new WorkspaceError(409, "SERVICE_CLOSED", "Ce jour est déclaré fermé ; aucune vente ne peut y être ajoutée.");
  if (!current) return tx.serviceDay.create({ data: { restaurantId, serviceDate: date(serviceDate), status: "open", coverage: "partial", actorId, source } });
  const nextSource = current.source === source || current.source === "mixed" ? current.source : "mixed";
  if (current.coverage !== "partial" || current.source !== nextSource)
    return tx.serviceDay.update({ where, data: { coverage: "partial", source: nextSource, actorId, revision: { increment: 1 } } });
  return current;
}

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
  const latest = await prisma.serviceDay.findFirst({ where: { restaurantId }, orderBy: { serviceDate: "desc" },
    include: { _count: { select: { sales: true } }, sales: { distinct: ["source"], select: { source: true } } } });
  if (!latest) return null;
  return { ...serviceDayDto(latest), sources: latest.sales.map((row) => row.source) };
}

export async function createSale(restaurantId: string, actorId: string, operationId: string, input: SaleValues) {
  const outcome = await prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const prior = await tx.dailySale.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } }, include: { saleItem: true } });
    if (prior) {
      if (prior.saleItemId === input.saleItemId && prior.serviceDate.getTime() === date(input.serviceDate).getTime() && prior.quantity === input.quantity) return { sale: saleDto(prior) };
      throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération correspond déjà à une autre vente.");
    }
    const sourceKey = `manual:${operationId}`;
    const previous = await tx.saleContribution.findUnique({ where: { restaurantId_sourceKey: { restaurantId, sourceKey } } });
    if (previous) {
      if (previous.saleItemId !== input.saleItemId || previous.serviceDate?.getTime() !== date(input.serviceDate).getTime() || previous.quantity !== input.quantity)
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération correspond déjà à une autre vente.");
      if (previous.status === "accepted") {
        const replayed = await tx.dailySale.findFirst({ where: { restaurantId, contributionId: previous.id }, include: { saleItem: true } });
        if (replayed) return { sale: saleDto(replayed) };
      }
      return { conflict: true as const };
    }
    const item = await tx.saleItem.findUnique({ where: { restaurantId_id: { restaurantId, id: input.saleItemId } } });
    if (!item) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "Article vendu introuvable dans votre espace.");
    const existing = await tx.dailySale.findUnique({ where: { restaurantId_serviceDate_saleItemId: {
      restaurantId, serviceDate: date(input.serviceDate), saleItemId: input.saleItemId,
    } }, include: { saleItem: true, contribution: true } });
    const status = existing ? "pending" : "accepted";
    const contribution = await createSaleContribution(tx, restaurantId, {
      source: "manual", sourceKey, sourceRevision: 1, sourceItemName: item.name,
      sourceDate: input.serviceDate, serviceDate: date(input.serviceDate), sourceQuantity: String(input.quantity), quantity: input.quantity,
      saleItemId: input.saleItemId, status, reviewRevision: existing ? 0 : 1,
      reviewedBy: existing ? null : actorId, reviewedAt: existing ? null : new Date(),
      reviewReason: existing ? null : "Saisie manuelle confirmée.",
    });
    await recordSaleContributionEvent(tx, { restaurantId, contributionId: contribution.id, operationId: `create:${sourceKey}`,
      revision: contribution.reviewRevision, kind: existing ? "conflict_detected" : "accepted", actorId,
      reason: existing ? "Vente déjà acceptée pour cet article et cette date ; revue requise." : "Saisie manuelle confirmée.",
      snapshot: { sourceItemName: item.name, sourceDate: input.serviceDate, quantity: input.quantity,
        existingSaleId: existing?.id ?? null } });
    if (existing) return { conflict: true as const };
    await ensureOpenPartialServiceDay(tx, restaurantId, actorId, input.serviceDate);
    const sale = await tx.dailySale.create({ data: {
      restaurantId, saleItemId: input.saleItemId, serviceDate: date(input.serviceDate),
      quantity: input.quantity, source: "manual", operationId, contributionId: contribution.id, createdBy: actorId, updatedBy: actorId,
    }, include: { saleItem: true } });
    return { sale: saleDto(sale) };
  });
  if ("conflict" in outcome) throw new WorkspaceError(409, "SALE_CONFLICT", "Une vente existe déjà ; le nouvel apport est en attente de réconciliation dans l’historique des apports.");
  return outcome.sale;
}

export async function correctSale(restaurantId: string, actorId: string, id: string, revision: number, input: SaleValues,
  operationId: string, reason: string) {
  await assertSaleItem(restaurantId, input.saleItemId);
  try {
    return await prisma.$transaction(async (tx) => {
      await lockSalesWorkspace(tx, restaurantId);
      const correctionEvent = await tx.saleContributionEvent.findUnique({ where: { restaurantId_operationId: {
        restaurantId, operationId: `correct:${operationId}`,
      } } });
      if (correctionEvent) {
        const snapshot = correctionEvent.snapshot as { saleId?: string; after?: { serviceDate?: string; saleItemId?: string; quantity?: number } };
        if (correctionEvent.kind !== "corrected" || snapshot.saleId !== id || correctionEvent.reason !== reason.slice(0, 240) ||
          snapshot.after?.serviceDate !== input.serviceDate || snapshot.after.saleItemId !== input.saleItemId || snapshot.after.quantity !== input.quantity)
          throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de correction existe déjà avec un autre contenu.");
        const replayed = await tx.dailySale.findFirst({ where: { id, restaurantId }, include: { saleItem: true } });
        if (!replayed) throw new WorkspaceError(409, "SALE_VOIDED", "La vente corrigée n’est plus active.");
        return saleDto(replayed);
      }
      const current = await tx.dailySale.findFirst({ where: { id, restaurantId }, include: { saleItem: true, contribution: true } });
      if (!current) throw new WorkspaceError(404, "NOT_FOUND", "Vente introuvable.");
      if (current.revision !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette vente a changé ; rechargez l’historique avant correction.");
      const oldDate = current.serviceDate.toISOString().slice(0, 10);
      for (const serviceDate of new Set([oldDate, input.serviceDate]))
        await ensureOpenPartialServiceDay(tx, restaurantId, actorId, serviceDate);
      const occupied = await tx.dailySale.findUnique({ where: { restaurantId_serviceDate_saleItemId: {
        restaurantId, serviceDate: date(input.serviceDate), saleItemId: input.saleItemId,
      } } });
      if (occupied && occupied.id !== current.id) throw new WorkspaceError(409, "SALE_CONFLICT", "Une autre vente occupe déjà cette date et cet article ; aucune correction appliquée.");
      const item = await tx.saleItem.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: input.saleItemId } } });
      const nextRevision = current.revision + 1;
      const contribution = await createSaleContribution(tx, restaurantId, {
        source: "manual", sourceKey: `correction:${id}:${nextRevision}`, sourceRevision: nextRevision,
        sourceItemName: item.name, sourceDate: input.serviceDate, serviceDate: date(input.serviceDate),
        sourceQuantity: String(input.quantity), quantity: input.quantity, saleItemId: input.saleItemId,
        status: "accepted", reviewRevision: 1, reviewedBy: actorId, reviewedAt: new Date(),
        reviewReason: reason.slice(0, 240), supersedesId: current.contributionId,
      });
      if (current.contribution) {
        await tx.saleContribution.update({ where: { id: current.contribution.id }, data: {
          status: "superseded", reviewRevision: { increment: 1 }, reviewedBy: actorId,
          reviewedAt: new Date(), reviewReason: reason.slice(0, 240),
        } });
        await recordSaleContributionEvent(tx, { restaurantId, contributionId: current.contribution.id,
          operationId: `correct:${operationId}`, revision: nextRevision, kind: "corrected", actorId,
          reason: reason.slice(0, 240), snapshot: { before: { serviceDate: oldDate, saleItemId: current.saleItemId,
            saleItemName: current.saleItem.name, quantity: current.quantity }, saleId: id,
          after: { serviceDate: input.serviceDate, saleItemId: input.saleItemId, quantity: input.quantity }, afterContributionId: contribution.id } });
      }
      await recordSaleContributionEvent(tx, { restaurantId, contributionId: contribution.id,
        operationId: `correction:${id}:${nextRevision}`, revision: 1, kind: "accepted", actorId,
        reason: reason.slice(0, 240), snapshot: { sourceItemName: item.name, sourceDate: input.serviceDate,
          quantity: input.quantity, supersedesId: current.contributionId } });
      const updated = await tx.dailySale.updateMany({ where: { id, restaurantId, revision }, data: {
        saleItemId: input.saleItemId, serviceDate: date(input.serviceDate), quantity: input.quantity,
        contributionId: contribution.id, updatedBy: actorId, revision: { increment: 1 },
      } });
      if (!updated.count) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette vente a changé ; rechargez l’historique avant correction.");
      return saleDto(await tx.dailySale.findFirstOrThrow({ where: { id, restaurantId }, include: { saleItem: true } }));
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new WorkspaceError(409, "SALE_CONFLICT", "Une vente existe déjà pour cet article et cette date.");
    throw error;
  }
}
