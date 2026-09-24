import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { ensureOpenPartialServiceDay } from "./salesService.js";
import { lockSalesWorkspace, recordSaleContributionEvent } from "./salesContributionLedger.js";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function markTicketBatchReviewed(tx: Parameters<typeof lockSalesWorkspace>[0], restaurantId: string, ticketBatchId: string | null) {
  if (!ticketBatchId) return;
  const pending = await tx.saleContribution.count({ where: { restaurantId, ticketBatchId, status: "pending" } });
  if (!pending) await tx.ticketZBatch.update({ where: { id: ticketBatchId }, data: { status: "reviewed" } });
}

export async function listSaleContributions(restaurantId: string, from: string, to: string) {
  const rows = await prisma.saleContribution.findMany({ where: { restaurantId,
    OR: [{ status: "pending" }, { serviceDate: { gte: date(from), lte: date(to) } },
      { serviceDate: null, createdAt: { gte: date(from) } }],
  }, include: { saleItem: { select: { name: true } }, importRecord: { select: { fileHash: true } },
    posBatch: { select: { provider: true, batchId: true, fromDate: true, toDate: true, coverage: true, provenance: true } },
    ticketBatch: { select: { contentHash: true, mimeType: true, byteSize: true, sourceDateText: true,
      serviceDate: true, status: true, provenance: true, recordCount: true } },
    events: { orderBy: { createdAt: "asc" } }, supersedes: { select: { id: true, source: true, sourceDate: true, sourceItemName: true, sourceQuantity: true } },
  }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 250 });
  const pending = rows.filter((row) => row.status === "pending" && row.serviceDate && row.saleItemId);
  const currentSales = pending.length ? await prisma.dailySale.findMany({ where: { restaurantId,
    serviceDate: { in: pending.map((row) => row.serviceDate!) }, saleItemId: { in: pending.map((row) => row.saleItemId!) },
  }, select: { id: true, serviceDate: true, quantity: true, revision: true, source: true, saleItemId: true } }) : [];
  const currentByKey = new Map(currentSales.map((sale) => [`${sale.serviceDate.toISOString().slice(0, 10)}:${sale.saleItemId}`, sale]));
  return rows.map((row) => {
    const currentSale = row.status === "pending" && row.serviceDate && row.saleItemId
      ? currentByKey.get(`${row.serviceDate.toISOString().slice(0, 10)}:${row.saleItemId}`) ?? null
      : null;
    return { id: row.id, source: row.source, sourceKey: row.sourceKey,
      sourceRevision: row.sourceRevision, importLine: row.importLine, sourceFileHash: row.importRecord?.fileHash ?? null,
      sourceRecordId: row.sourceRecordId, sourceExternalItemId: row.sourceExternalItemId, sourceRefunded: row.sourceRefunded,
      posBatch: row.posBatch ? { provider: row.posBatch.provider, batchId: row.posBatch.batchId,
        from: row.posBatch.fromDate.toISOString().slice(0, 10), to: row.posBatch.toDate.toISOString().slice(0, 10),
        coverage: row.posBatch.coverage, provenance: row.posBatch.provenance } : null,
      ticketBatch: row.ticketBatch ? { contentHash: row.ticketBatch.contentHash, mimeType: row.ticketBatch.mimeType,
        byteSize: row.ticketBatch.byteSize, sourceDateText: row.ticketBatch.sourceDateText,
        serviceDate: row.ticketBatch.serviceDate?.toISOString().slice(0, 10) ?? null,
        status: row.ticketBatch.status, provenance: row.ticketBatch.provenance, recordCount: row.ticketBatch.recordCount,
        originalFileStored: false } : null,
      ticketLineNumber: row.ticketLineNumber,
      sourceItemName: row.sourceItemName, sourceDate: row.sourceDate, serviceDate: row.serviceDate?.toISOString().slice(0, 10) ?? null,
      sourceQuantity: row.sourceQuantity, quantity: row.quantity, saleItemId: row.saleItemId,
      saleItemName: row.saleItem?.name ?? null, status: row.status, reviewRevision: row.reviewRevision,
      reviewedBy: row.reviewedBy, reviewedAt: row.reviewedAt?.toISOString() ?? null, reviewReason: row.reviewReason,
      currentSale: currentSale ? { ...currentSale, serviceDate: currentSale.serviceDate.toISOString().slice(0, 10) } : null,
      supersedes: row.supersedes, events: row.events.map((event) => ({ kind: event.kind, actorId: event.actorId,
        reason: event.reason, revision: event.revision, createdAt: event.createdAt.toISOString(), snapshot: event.snapshot })),
    };
  });
}

export async function reviewSaleContribution(restaurantId: string, actorId: string, id: string, revision: number,
  choice: "replace" | "keep" | "reject", operationId: string, reason: string, selectedSaleItemId?: string) {
  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const eventOperationId = `review:${operationId}`;
    const replay = await tx.saleContributionEvent.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: eventOperationId } } });
    if (replay) {
      const snapshot = replay.snapshot as { decision?: string; saleItemId?: string };
      if (replay.contributionId !== id || replay.kind !== (choice === "replace" ? "replaced" : "rejected") ||
        replay.reason !== reason.slice(0, 240) || snapshot.decision !== (choice === "keep" ? "keep_existing" : choice === "reject" ? "reject_candidate" : "replace") ||
        (selectedSaleItemId !== undefined && snapshot.saleItemId !== selectedSaleItemId))
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette décision existe déjà avec un autre contenu.");
      return { replayed: true, status: choice === "replace" ? "accepted" as const : "rejected" as const };
    }
    const candidate = await tx.saleContribution.findFirst({ where: { restaurantId, id }, include: { ticketBatch: { select: { provenance: true } } } });
    if (!candidate) throw new WorkspaceError(404, "NOT_FOUND", "Apport introuvable.");
    if (candidate.status !== "pending" || candidate.reviewRevision !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cet apport a déjà été revu ; rechargez la liste.");
    if (selectedSaleItemId && !candidate.posBatchId && !candidate.ticketBatchId) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "La correspondance d’article ne s’applique qu’aux lignes de source externe.");
    if (candidate.sourceRefunded && choice !== "reject") throw new WorkspaceError(409, "POS_REFUND_NOT_SALE", "Un remboursement POS doit être écarté ou rapproché séparément, pas compté comme vente.");
    if (candidate.sourceRefunded && selectedSaleItemId) throw new WorkspaceError(409, "POS_REFUND_NOT_SALE", "Un remboursement POS ne peut pas créer de correspondance d’article vendu.");
    const saleItemId = selectedSaleItemId ?? candidate.saleItemId;
    const item = saleItemId ? await tx.saleItem.findUnique({ where: { restaurantId_id: { restaurantId, id: saleItemId } } }) : null;
    if (saleItemId && !item) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "Article vendu introuvable dans cet espace.");
    if (choice !== "reject" && selectedSaleItemId && candidate.posBatchId && candidate.sourceExternalItemId) {
      if (!candidate.posBatchId) throw new WorkspaceError(409, "MISSING_POS_BATCH", "Le lot de caisse lié à cette ligne n’existe plus.");
      const provider = (await tx.posSalesBatch.findFirst({ where: { restaurantId, id: candidate.posBatchId }, select: { provider: true } }))?.provider;
      if (!provider) throw new WorkspaceError(409, "MISSING_POS_BATCH", "Le lot de caisse lié à cette ligne n’existe plus.");
      await tx.posArticleMapping.upsert({
        where: { restaurantId_provider_externalItemId: { restaurantId, provider, externalItemId: candidate.sourceExternalItemId } },
        create: { restaurantId, provider, externalItemId: candidate.sourceExternalItemId, saleItemId: selectedSaleItemId, actorId },
        update: { saleItemId: selectedSaleItemId, actorId },
      });
    }
    if (choice !== "replace") {
      if (choice === "keep") {
        if (!saleItemId || !candidate.serviceDate) throw new WorkspaceError(400, "NO_EXISTING_SALE", "Aucune vente existante ne peut être conservée sans article associé.");
        const current = await tx.dailySale.findUnique({ where: { restaurantId_serviceDate_saleItemId: {
          restaurantId, serviceDate: candidate.serviceDate, saleItemId,
        } } });
        if (!current) throw new WorkspaceError(409, "NO_EXISTING_SALE", "Aucune vente existante ne correspond à cet article et ce service.");
      }
      await tx.saleContribution.update({ where: { id }, data: { status: "rejected", reviewRevision: { increment: 1 },
        ...(choice === "keep" && candidate.ticketBatchId && selectedSaleItemId ? { saleItemId: selectedSaleItemId } : {}),
        reviewedBy: actorId, reviewedAt: new Date(), reviewReason: reason.slice(0, 240) } });
      await recordSaleContributionEvent(tx, { restaurantId, contributionId: id, operationId: eventOperationId,
        revision: revision + 1, kind: "rejected", actorId, reason: reason.slice(0, 240),
        snapshot: { decision: choice === "keep" ? "keep_existing" : "reject_candidate",
          sourceKey: candidate.sourceKey, saleItemId: selectedSaleItemId ?? null } });
      await markTicketBatchReviewed(tx, restaurantId, candidate.ticketBatchId);
      return { replayed: false, status: "rejected" as const };
    }
    if (!candidate.serviceDate || candidate.quantity === null || !saleItemId || !item)
      throw new WorkspaceError(400, "INVALID_CONTRIBUTION", "Cet apport ne contient pas de date, quantité et article valides.");
    const acceptedSource = candidate.ticketBatch?.provenance === "demo_simulation" ? "demo_simulation" : candidate.source;
    await ensureOpenPartialServiceDay(tx, restaurantId, actorId, candidate.serviceDate.toISOString().slice(0, 10),
      acceptedSource === "demo_simulation" ? "demo_simulation" : "recorded");
    const current = await tx.dailySale.findUnique({ where: { restaurantId_serviceDate_saleItemId: {
      restaurantId, serviceDate: candidate.serviceDate, saleItemId,
    } }, include: { contribution: true } });
    if (current?.contribution) {
      await tx.saleContribution.update({ where: { id: current.contribution.id }, data: { status: "superseded",
        reviewRevision: { increment: 1 }, reviewedBy: actorId, reviewedAt: new Date(), reviewReason: reason.slice(0, 240) } });
      await recordSaleContributionEvent(tx, { restaurantId, contributionId: current.contribution.id,
        operationId: `replaced:${operationId}`, revision: current.revision + 1, kind: "replaced", actorId,
        reason: reason.slice(0, 240), snapshot: { before: { quantity: current.quantity, contributionId: current.contribution.id },
          replacedBy: candidate.id } });
    }
    await tx.saleContribution.update({ where: { id }, data: { saleItemId, status: "accepted", reviewRevision: { increment: 1 },
      reviewedBy: actorId, reviewedAt: new Date(), reviewReason: reason.slice(0, 240) } });
    if (current) await tx.dailySale.update({ where: { id: current.id }, data: { quantity: candidate.quantity,
      source: acceptedSource, importId: candidate.importId, importLine: candidate.importLine,
      contributionId: candidate.id, updatedBy: actorId, revision: { increment: 1 } } });
    else await tx.dailySale.create({ data: { restaurantId, saleItemId: item.id, serviceDate: candidate.serviceDate,
      quantity: candidate.quantity, source: acceptedSource, operationId: `reconcile:${candidate.sourceKey}`,
      importId: candidate.importId, importLine: candidate.importLine, contributionId: candidate.id,
      createdBy: actorId, updatedBy: actorId } });
    await recordSaleContributionEvent(tx, { restaurantId, contributionId: id, operationId: eventOperationId,
      revision: revision + 1, kind: "replaced", actorId, reason: reason.slice(0, 240),
      snapshot: { decision: "replace", replacedContributionId: current?.contributionId ?? null,
        acceptedQuantity: candidate.quantity, saleItemId, sourceRecordId: candidate.sourceRecordId,
        serviceDate: candidate.serviceDate.toISOString().slice(0, 10) } });
    await markTicketBatchReviewed(tx, restaurantId, candidate.ticketBatchId);
    return { replayed: false, status: "accepted" as const };
  });
}

export async function recordSaleOutcome(restaurantId: string, actorId: string, id: string, revision: number,
  kind: "voided" | "refund_recorded", operationId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const eventOperationId = `${kind}:${operationId}`;
    const replay = await tx.saleContributionEvent.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: eventOperationId } } });
    if (replay) {
      const snapshot = replay.snapshot as { saleId?: string; contributionId?: string; quantity?: number };
      if (snapshot.saleId !== id || snapshot.contributionId !== replay.contributionId || replay.kind !== kind || replay.reason !== reason.slice(0, 240))
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération existe déjà avec un autre contenu.");
      return { replayed: true, quantity: kind === "refund_recorded" ? snapshot.quantity ?? null : null };
    }
    const sale = await tx.dailySale.findFirst({ where: { id, restaurantId }, include: { contribution: true, saleItem: true } });
    if (!sale) throw new WorkspaceError(404, "NOT_FOUND", "Vente active introuvable.");
    if (sale.revision !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette vente a changé ; rechargez l’historique.");
    if (!sale.contribution) throw new WorkspaceError(409, "MISSING_PROVENANCE", "Cette vente ne possède pas de contribution source réconciliable.");
    if (kind === "voided") await ensureOpenPartialServiceDay(tx, restaurantId, actorId, sale.serviceDate.toISOString().slice(0, 10));
    const snapshot = { saleId: sale.id, source: sale.source, serviceDate: sale.serviceDate.toISOString().slice(0, 10),
      contributionId: sale.contribution.id, saleItemId: sale.saleItemId, saleItemName: sale.saleItem.name, quantity: sale.quantity,
      quantityChanged: kind === "voided" };
    if (kind === "voided") {
      await tx.dailySale.delete({ where: { id: sale.id } });
      await tx.saleContribution.update({ where: { id: sale.contribution.id }, data: { status: "voided",
        reviewRevision: { increment: 1 }, reviewedBy: actorId, reviewedAt: new Date(), reviewReason: reason.slice(0, 240) } });
    }
    await recordSaleContributionEvent(tx, { restaurantId, contributionId: sale.contribution.id,
      operationId: eventOperationId, revision: sale.revision + (kind === "voided" ? 1 : 0), kind, actorId,
      reason: reason.slice(0, 240), snapshot: { ...snapshot, refundDoesNotChangeSoldQuantity: kind === "refund_recorded" } });
    return { replayed: false, quantity: kind === "refund_recorded" ? sale.quantity : null };
  });
}
