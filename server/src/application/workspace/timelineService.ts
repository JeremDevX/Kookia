import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { decisionEvent, documentEvent, mappingEvent, productionEvent, purchaseOrderEvent, purchaseReceiptEvent,
  saleEvent, serviceEvent, stockEvent, versionEvent, type TimelineDocumentRow, type TimelineEvent } from "./timelineEventMappers.js";
import { listTimelineKeys, type TimelineCursor } from "./timelineKeys.js";
import { stockReceiptProvenance } from "./stockMovementProvenance.js";

const LEGACY_LIMIT = 5_000;
const PAGE_SIZE = 20;
const SEARCH_BATCH_SIZE = 500;
const SEARCH_BATCH_LIMIT = 4;

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
  if (kinds.length === 0) return [];
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

async function readBatch(restaurantId: string, from: string, to: string, bounds: ReturnType<typeof timelineDateBounds>,
  after: TimelineCursor | undefined, size: number, workspaceMode: "operational" | "demo") {
  return prisma.$transaction(async (db) => {
    const keys = await listTimelineKeys(db, restaurantId, from, to, bounds, after, size + 1);
    const hasMore = keys.length > size;
    if (hasMore) keys.pop();
    if (keys.length === 0) return { events: [], hasMore };

    const ids = new Map<string, string[]>();
    for (const key of keys) {
      const sourceIds = ids.get(key.source);
      if (sourceIds) sourceIds.push(key.rowId);
      else ids.set(key.source, [key.rowId]);
    }
    const whereIds = (source: string) => ({ restaurantId, id: { in: ids.get(source) ?? [] } });
    const [documents, movements, productions, sales, serviceDays, recipeVersions, mappings, decisions, orders, receipts] =
      await Promise.all([
        listDocumentEvents(db, restaurantId, ids.get("document") ?? []),
        db.stockMovement.findMany({ where: whereIds("stock"), include: { purchaseReceiptLine: stockReceiptProvenance } }),
        db.production.findMany({ where: whereIds("production"),
          include: { recipeVersion: { select: { version: true, effectiveFrom: true } } } }),
        db.dailySale.findMany({ where: whereIds("sale"),
          include: { saleItem: { select: { name: true } }, serviceDay: { select: { source: true } } } }),
        db.serviceDay.findMany({ where: { restaurantId, serviceDate: {
          in: (ids.get("service") ?? []).map((date) => new Date(`${date}T00:00:00.000Z`)),
        } } }),
        db.recipeVersion.findMany({ where: whereIds("recipe") }),
        db.saleItemRecipeMapping.findMany({ where: whereIds("mapping"), include: { saleItem: { select: { name: true } } } }),
        db.recommendationDecision.findMany({ where: whereIds("decision") }),
        db.purchaseOrder.findMany({ where: whereIds("purchase-order"), include: { lines: { orderBy: { id: "asc" } } } }),
        db.purchaseReceipt.findMany({ where: whereIds("purchase-receipt"),
          include: { supplier: { select: { name: true } }, lines: { orderBy: { id: "asc" } } } }),
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
    return { events: keys.map((key) => ({ key, event: byId.get(key.id)! })), hasMore };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
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
  const events: TimelineEvent[] = [];
  let after: TimelineCursor | undefined = page?.cursor;
  let next: TimelineCursor | undefined;

  // Search rendered text only. Continue across bounded scans for long, sparse queries.
  for (let batch = 0; batch < (query ? SEARCH_BATCH_LIMIT : 1); batch++) {
    const result = await readBatch(restaurantId, from, to, bounds, after, query ? SEARCH_BATCH_SIZE : limit, mode);
    for (const { key, event } of result.events) {
      const matches = !query || normalizeSearchText([event.label, event.detail, event.qualifier ?? ""].join(" ")).includes(query);
      if (matches) {
        if (events.length === limit) {
          next = after;
          break;
        }
        events.push(event);
      }
      after = key;
    }
    if (next || !result.hasMore) break;
    if (events.length === limit || batch === SEARCH_BATCH_LIMIT - 1 || !query) {
      next = after;
      break;
    }
  }

  return { from, to, asOf, count: events.length, truncated: !page && Boolean(next), events,
    ...(page ? { nextCursor: next ? Buffer.from(JSON.stringify({ at: next.at, id: next.id })).toString("base64url") : null } : {}),
  };
}
