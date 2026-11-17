import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { decisionEvent, documentEvent, mappingEvent, productionEvent, purchaseOrderEvent, purchaseReceiptEvent,
  saleEvent, serviceEvent, stockEvent, versionEvent, type TimelineDocumentRow, type TimelineEvent } from "./timelineEventMappers.js";
import { listTimelineKeys, type TimelineCursor, type TimelineKey } from "./timelineKeys.js";
import { stockReceiptProvenance } from "./stockMovementProvenance.js";

const LEGACY_LIMIT = 5_000;
const PAGE_SIZE = 20;
const SEARCH_BATCH_SIZE = 500;
const SEARCH_SCAN_LIMIT = 2_000;

function parisMidnight(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcMidnight));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(local.find((item) => item.type === type)?.value);
  const localAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return new Date(utcMidnight - (localAsUtc - utcMidnight));
}

function addDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function timelineDateBounds(from: string, to: string, asOf: string) {
  return {
    start: parisMidnight(from),
    end: parisMidnight(addDay(to)),
    knownThrough: new Date(parisMidnight(addDay(asOf)).getTime() - 1),
  };
}

async function listDocumentEvents(db: Prisma.TransactionClient, restaurantId: string, kinds: string[]) {
  // Select only safe metadata; transcription content and stock-line payloads never enter the application.
  return db.$queryRaw<TimelineDocumentRow[]>(Prisma.sql`
    SELECT kind,
      "updatedAt" AS "knownAt",
      data ->> 'date' AS "sourceDate",
      LEFT(COALESCE(data ->> 'title', data ->> 'sourceTitle', ''), 120) AS title,
      LEFT(COALESCE(data ->> 'supplier', data ->> 'sourceSupplier', ''), 120) AS supplier,
      LEFT(COALESCE(data ->> 'type', data ->> 'sourceType', ''), 60) AS "documentType",
      LEFT(COALESCE(data ->> 'status', data ->> 'sourceStatus', ''), 60) AS status,
      LEFT(COALESCE(data ->> 'provenance', ''), 40) AS provenance,
      LEFT(COALESCE(data ->> 'stockEffect', ''), 40) AS "stockEffect",
      CASE WHEN jsonb_typeof(data -> 'stockLines') = 'array' THEN jsonb_array_length(data -> 'stockLines')
        WHEN data ->> 'sourceLineCount' ~ '^[0-9]{1,6}$' THEN (data ->> 'sourceLineCount')::integer
        ELSE 0 END AS "lineCount"
    FROM "WorkspaceDocument"
    WHERE "restaurantId" = ${restaurantId} AND kind IN (${Prisma.join(kinds)})
  `);
}

async function readEvents(db: Prisma.TransactionClient, restaurantId: string, keys: TimelineKey[],
  workspaceMode: "operational" | "demo") {
  const ids = new Map<string, string[]>();
  for (const key of keys) {
    const sourceIds = ids.get(key.source);
    if (sourceIds) sourceIds.push(key.rowId);
    else ids.set(key.source, [key.rowId]);
  }
  const find = <T>(source: string, fetch: (sourceIds: string[]) => Promise<T[]>) => {
    const sourceIds = ids.get(source);
    return sourceIds ? fetch(sourceIds) : [];
  };
  const whereIds = (sourceIds: string[]) => ({ restaurantId, id: { in: sourceIds } });
  const [documents, movements, productions, sales, serviceDays, recipeVersions, mappings, decisions, orders, receipts] =
    await Promise.all([
      find("document", (ids) => listDocumentEvents(db, restaurantId, ids)),
      find("stock", (ids) => db.stockMovement.findMany({ where: whereIds(ids), include: { purchaseReceiptLine: stockReceiptProvenance } })),
      find("production", (ids) => db.production.findMany({ where: whereIds(ids),
        include: { recipeVersion: { select: { version: true, effectiveFrom: true } } } })),
      find("sale", (ids) => db.dailySale.findMany({ where: whereIds(ids),
        include: { saleItem: { select: { name: true } }, serviceDay: { select: { source: true } } } })),
      find("service", (ids) => db.serviceDay.findMany({ where: { restaurantId, serviceDate: {
        in: ids.map((date) => new Date(`${date}T00:00:00.000Z`)),
      } } })),
      find("recipe", (ids) => db.recipeVersion.findMany({ where: whereIds(ids) })),
      find("mapping", (ids) => db.saleItemRecipeMapping.findMany({ where: whereIds(ids), include: { saleItem: { select: { name: true } } } })),
      find("decision", (ids) => db.recommendationDecision.findMany({ where: whereIds(ids) })),
      find("purchase-order", (ids) => db.purchaseOrder.findMany({ where: whereIds(ids), include: { lines: { orderBy: { id: "asc" } } } })),
      find("purchase-receipt", (ids) => db.purchaseReceipt.findMany({ where: whereIds(ids),
        include: { supplier: { select: { name: true } }, lines: { orderBy: { id: "asc" } } } })),
    ]);
  const events: TimelineEvent[] = [
    ...documents.map((row) => documentEvent(row, workspaceMode)),
    ...movements.map((row) => stockEvent(row, workspaceMode)),
    ...productions.map((row) => productionEvent(row, workspaceMode)),
    ...sales.map((row) => saleEvent(row, workspaceMode)),
    ...serviceDays.map((row) => serviceEvent(row, workspaceMode)),
    ...recipeVersions.map((row) => versionEvent(row, workspaceMode)),
    ...mappings.map((row) => mappingEvent(row, workspaceMode)),
    ...decisions.map((row) => decisionEvent(row, workspaceMode)),
    ...orders.map((row) => purchaseOrderEvent(row, workspaceMode)),
    ...receipts.map((row) => purchaseReceiptEvent(row, workspaceMode)),
  ];
  const byId = new Map(events.map((event) => [event.id, event]));
  return keys.map((key) => ({ key, event: byId.get(key.id)! }));
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface TimelinePageQuery {
  q?: string;
  limit?: number;
  cursor?: TimelineCursor;
}

export async function listTimeline(restaurantId: string, from: string, to: string, asOf: string, page?: TimelinePageQuery) {
  const bounds = timelineDateBounds(from, to, asOf);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  const mode = restaurant?.mode === "demo" ? "demo" : "operational";
  const query = normalizeSearchText(page?.q?.trim() ?? "");
  const limit = page ? page.limit ?? PAGE_SIZE : LEGACY_LIMIT;
  const scanLimit = query ? SEARCH_SCAN_LIMIT : limit;
  const batchSize = query ? SEARCH_BATCH_SIZE : limit;
  const { events, next } = await prisma.$transaction(async (db) => {
    const keys = await listTimelineKeys(db, restaurantId, from, to, bounds, page?.cursor, scanLimit + 1);
    const hasMore = keys.length > scanLimit;
    if (hasMore) keys.pop();
    const events: TimelineEvent[] = [];
    let after: TimelineCursor | undefined = page?.cursor;

    // Search rendered text only and defer fetching later batches until needed.
    for (let start = 0; start < keys.length; start += batchSize) {
      const batch = await readEvents(db, restaurantId, keys.slice(start, start + batchSize), mode);
      for (const { key, event } of batch) {
        const matches = !query || normalizeSearchText([event.label, event.detail, event.qualifier ?? ""].join(" ")).includes(query);
        if (matches) {
          if (events.length === limit) return { events, next: after };
          events.push(event);
        }
        after = key;
      }
      if (events.length === limit && start + batchSize < keys.length) return { events, next: after };
    }
    return { events, next: hasMore ? after : undefined };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { from, to, asOf, count: events.length, truncated: !page && Boolean(next), events,
    ...(page ? { nextCursor: next ? Buffer.from(JSON.stringify({ at: next.at, id: next.id })).toString("base64url") : null } : {}),
  };
}
