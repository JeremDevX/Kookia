import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { lockSalesWorkspace } from "./salesContributionLedger.js";
import { posSalesBatchSchema, posSyncWindowSchema, type PosAdapter, type PosSalesRecord } from "../../integrations/posAdapter.js";

const providerIdSchema = /^[a-z][a-z0-9_-]{0,59}$/;
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const parisToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const sourceKey = (provider: string, record: PosSalesRecord) =>
  `pos:${provider}:${record.sourceRecordId}:${record.revision}`;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalizedName = (value: string) => value.trim().toLocaleLowerCase("fr-FR");

function isSameSourceRecord(existing: {
  sourceRecordId: string | null; sourceExternalItemId: string | null; sourceItemName: string;
  sourceDate: string; sourceQuantity: string; sourceRefunded: boolean;
}, incoming: PosSalesRecord) {
  return existing.sourceRecordId === incoming.sourceRecordId &&
    existing.sourceExternalItemId === (incoming.externalItemId ?? null) &&
    existing.sourceItemName === incoming.itemLabel && existing.sourceDate === incoming.serviceDate &&
    existing.sourceQuantity === String(incoming.quantity) && existing.sourceRefunded === incoming.refunded;
}

export async function syncPosSales(restaurantId: string, actorId: string, window: unknown, adapter: PosAdapter) {
  const parsedWindow = posSyncWindowSchema.safeParse(window);
  if (!parsedWindow.success) throw new WorkspaceError(400, "INVALID_POS_WINDOW", "La période de caisse doit être valide et limitée à 31 jours.");
  if (parsedWindow.data.to > parisToday()) throw new WorkspaceError(400, "FUTURE_POS_WINDOW", "La période de caisse ne peut pas contenir de date future.");
  if (!providerIdSchema.test(adapter.provider)) throw new WorkspaceError(500, "INVALID_POS_PROVIDER", "L’identifiant de la source POS est invalide.");

  const { from, to } = parsedWindow.data;
  const previousState = await prisma.posSyncState.findUnique({
    where: { restaurantId_provider: { restaurantId, provider: adapter.provider } },
    select: { cursor: true, lastBatchId: true, revision: true },
  });
  const cursorBefore = previousState?.cursor ?? null;
  if (cursorBefore && previousState?.lastBatchId) {
    const previousBatch = await prisma.posSalesBatch.findUnique({ where: { restaurantId_provider_batchId: {
      restaurantId, provider: adapter.provider, batchId: previousState.lastBatchId,
    } }, select: { fromDate: true, toDate: true } });
    if (!previousBatch || previousBatch.fromDate.getTime() !== dateValue(from).getTime() ||
      previousBatch.toDate.getTime() !== dateValue(to).getTime()) {
      throw new WorkspaceError(409, "POS_WINDOW_CONFLICT", "Une fenêtre de caisse partielle doit être reprise jusqu’à son curseur final avant d’en démarrer une autre.");
    }
  }
  let read;
  try { read = await adapter.read(restaurantId, { from, to, cursor: cursorBefore }); }
  catch { return { status: "unavailable" as const, reason: "temporary_error" as const }; }
  if (read.status === "unavailable") return { status: "unavailable" as const, reason: read.reason };

  const parsedBatch = posSalesBatchSchema.safeParse(read.payload);
  if (!parsedBatch.success || parsedBatch.data.records.some((record) => record.serviceDate < from || record.serviceDate > to)) {
    throw new WorkspaceError(502, "INVALID_POS_BATCH", "La caisse a renvoyé un lot incomplet ou hors période. Aucune vente n’a été ajoutée.");
  }
  const batch = { ...parsedBatch.data, records: [...parsedBatch.data.records].sort((a, b) =>
    a.serviceDate.localeCompare(b.serviceDate) || a.sourceRecordId.localeCompare(b.sourceRecordId)) };
  const contentHash = digest(batch);

  try {
    return await prisma.$transaction(async (tx) => {
      await lockSalesWorkspace(tx, restaurantId);
      const priorBatch = await tx.posSalesBatch.findUnique({ where: { restaurantId_provider_batchId: {
        restaurantId, provider: adapter.provider, batchId: batch.batchId,
      } } });
      if (priorBatch) {
        if (priorBatch.contentHash !== contentHash || priorBatch.fromDate.getTime() !== dateValue(from).getTime() ||
          priorBatch.toDate.getTime() !== dateValue(to).getTime() ||
          priorBatch.provenance !== (adapter.provenance === "demo_simulation" ? "demo_simulation" : "recorded_sales")) {
          throw new WorkspaceError(409, "POS_BATCH_CHANGED", "Un lot déjà reçu a changé de contenu ou de période.");
        }
        return { status: "ok" as const, provider: adapter.provider, batchId: batch.batchId,
          coverage: priorBatch.coverage, provenance: priorBatch.provenance, recordCount: priorBatch.recordCount,
          candidateCount: priorBatch.candidateCount, duplicateRecords: priorBatch.duplicateRecordCount,
          replayed: true, nextCursor: priorBatch.cursorAfter, receivedAt: priorBatch.createdAt.toISOString() };
      }

      const syncState = await tx.posSyncState.findUnique({ where: { restaurantId_provider: {
        restaurantId, provider: adapter.provider,
      } } });
      if ((syncState?.revision ?? 0) !== (previousState?.revision ?? 0)) {
        throw new WorkspaceError(409, "POS_CURSOR_CHANGED", "La synchronisation de caisse a avancé. Rechargez avant de reprendre.");
      }

      const recordIds = [...new Set(batch.records.map((record) => record.sourceRecordId))];
      const previousRecords = recordIds.length ? await tx.saleContribution.findMany({
        where: { restaurantId, source: { in: ["pos", "demo_simulation"] }, sourceRecordId: { in: recordIds }, posBatch: { provider: adapter.provider } },
        include: { posBatch: { select: { provider: true } } }, orderBy: { sourceRevision: "desc" },
      }) : [];
      const previousByRecord = new Map<string, typeof previousRecords>();
      for (const previous of previousRecords) {
        const rows = previousByRecord.get(previous.sourceRecordId!) ?? [];
        rows.push(previous);
        previousByRecord.set(previous.sourceRecordId!, rows);
      }

      const externalIds = [...new Set(batch.records.flatMap((record) => record.externalItemId ? [record.externalItemId] : []))];
      const [articleMappings, saleItems] = await Promise.all([
        externalIds.length ? tx.posArticleMapping.findMany({ where: { restaurantId, provider: adapter.provider,
          externalItemId: { in: externalIds } } }) : Promise.resolve([]),
        tx.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true, normalizedName: true } }),
      ]);
      const mappedItems = new Map(articleMappings.map((mapping) => [mapping.externalItemId, mapping.saleItemId]));
      const itemIdsByName = new Map(saleItems.map((item) => [item.normalizedName, item.id]));
      const now = new Date();
      const posBatch = await tx.posSalesBatch.create({ data: { id: randomUUID(), restaurantId, provider: adapter.provider,
        batchId: batch.batchId, fromDate: dateValue(from), toDate: dateValue(to), cursorBefore,
        cursorAfter: batch.nextCursor, coverage: batch.coverage, provenance: adapter.provenance === "demo_simulation" ? "demo_simulation" : "recorded_sales",
        contentHash, recordCount: batch.records.length, createdBy: actorId } });
      const contributions: Prisma.SaleContributionCreateManyInput[] = [];
      const events: Prisma.SaleContributionEventCreateManyInput[] = [];
      let duplicateRecords = 0;
      for (const record of batch.records) {
        const previous = previousByRecord.get(record.sourceRecordId) ?? [];
        const highestRevision = previous[0];
        if (highestRevision && highestRevision.sourceRevision >= record.revision) {
          const sameRevision = highestRevision.sourceRevision === record.revision && isSameSourceRecord(highestRevision, record);
          if (!sameRevision) throw new WorkspaceError(409, "POS_RECORD_CHANGED", "Une ligne de caisse a changé sans nouvelle révision source.");
          duplicateRecords++;
          continue;
        }

        const saleItemId = (record.externalItemId ? mappedItems.get(record.externalItemId) : undefined) ??
          itemIdsByName.get(normalizedName(record.itemLabel)) ?? null;
        const id = randomUUID();
        const key = sourceKey(adapter.provider, record);
        const reviewReason = record.refunded
          ? "Remboursement reçu de la caisse ; aucune quantité vendue n’est retirée automatiquement."
          : "Ligne reçue de la caisse ; une revue humaine est nécessaire avant de compter la vente.";
        if (highestRevision?.status === "pending") {
          await tx.saleContribution.update({ where: { id: highestRevision.id }, data: { status: "superseded",
            reviewRevision: { increment: 1 }, reviewedBy: actorId, reviewedAt: now,
            reviewReason: "La caisse a fourni une révision plus récente de cette ligne." } });
          await tx.saleContributionEvent.create({ data: { restaurantId, contributionId: highestRevision.id,
            operationId: `pos:supersede:${digest(key)}`, revision: highestRevision.reviewRevision + 1,
            kind: "replaced", actorId, reason: "Révision POS plus récente reçue.",
            snapshot: { replacedBySourceKey: key, sourceRecordId: record.sourceRecordId } } });
        }
        contributions.push({ id, restaurantId, source: adapter.provenance === "demo_simulation" ? "demo_simulation" : "pos",
          sourceKey: key, sourceRevision: record.revision,
          posBatchId: posBatch.id, sourceRecordId: record.sourceRecordId, sourceExternalItemId: record.externalItemId ?? null,
          sourceRefunded: record.refunded, sourceItemName: record.itemLabel, sourceDate: record.serviceDate,
          serviceDate: dateValue(record.serviceDate), sourceQuantity: String(record.quantity),
          quantity: record.refunded ? null : record.quantity, saleItemId, status: "pending", reviewRevision: 0, createdAt: now });
        events.push({ id: randomUUID(), restaurantId, contributionId: id,
          operationId: `pos:receive:${digest(key)}`, revision: 0,
          kind: record.refunded ? "refund_recorded" : "source_received", actorId, reason: reviewReason,
          snapshot: { provider: adapter.provider, batchId: batch.batchId, coverage: batch.coverage,
            sourceRecordId: record.sourceRecordId, sourceRevision: record.revision,
            externalItemId: record.externalItemId ?? null, itemLabel: record.itemLabel,
            serviceDate: record.serviceDate, sourceQuantity: record.quantity, mappedSaleItemId: saleItemId,
            provenance: adapter.provenance, refunded: record.refunded } as Prisma.InputJsonObject, createdAt: now });
      }
      if (contributions.length) {
        await tx.saleContribution.createMany({ data: contributions });
        await tx.saleContributionEvent.createMany({ data: events });
      }
      await tx.posSalesBatch.update({ where: { id: posBatch.id }, data: {
        candidateCount: contributions.length, duplicateRecordCount: duplicateRecords,
      } });
      await tx.posSyncState.upsert({ where: { restaurantId_provider: { restaurantId, provider: adapter.provider } },
        create: { restaurantId, provider: adapter.provider, cursor: batch.nextCursor, lastBatchId: batch.batchId, lastSuccessAt: now, revision: 1 },
        update: { cursor: batch.nextCursor, lastBatchId: batch.batchId, lastSuccessAt: now, revision: { increment: 1 } } });
      return { status: "ok" as const, provider: adapter.provider, batchId: batch.batchId,
          coverage: batch.coverage, provenance: adapter.provenance, recordCount: batch.records.length, candidateCount: contributions.length,
        duplicateRecords, replayed: false, nextCursor: batch.nextCursor, receivedAt: now.toISOString() };
    }, { maxWait: 20_000, timeout: 60_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const saved = await prisma.posSalesBatch.findUnique({ where: { restaurantId_provider_batchId: {
        restaurantId, provider: adapter.provider, batchId: batch.batchId,
      } } });
      if (saved?.contentHash === contentHash && saved.fromDate.getTime() === dateValue(from).getTime() &&
        saved.toDate.getTime() === dateValue(to).getTime() &&
        saved.provenance === (adapter.provenance === "demo_simulation" ? "demo_simulation" : "recorded_sales")) return { status: "ok" as const, provider: adapter.provider,
        batchId: batch.batchId, coverage: saved.coverage, provenance: saved.provenance, recordCount: saved.recordCount,
        candidateCount: saved.candidateCount, duplicateRecords: saved.duplicateRecordCount, replayed: true,
        nextCursor: saved.cursorAfter, receivedAt: saved.createdAt.toISOString() };
      throw new WorkspaceError(409, "POS_SYNC_CONFLICT", "La synchronisation de caisse a rencontré un conflit ; aucune donnée partielle n’a été enregistrée.");
    }
    throw error;
  }
}
