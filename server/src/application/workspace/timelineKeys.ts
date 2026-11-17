import { Prisma } from "@prisma/client";
import type { timelineDateBounds } from "./timelineService.js";

export interface TimelineKey {
  source: string;
  rowId: string;
  id: string;
  at: string;
}

export type TimelineCursor = Pick<TimelineKey, "at" | "id">;

export function listTimelineKeys(db: Prisma.TransactionClient, restaurantId: string, from: string, to: string,
  bounds: ReturnType<typeof timelineDateBounds>, cursor: TimelineCursor | undefined, take: number) {
  const { start, end, knownThrough } = bounds;
  const rowId = Prisma.sql`id`;
  const createdAt = Prisma.sql`"createdAt"`;
  const documentDate = Prisma.sql`NULLIF(data ->> 'date', '')`;
  const dated = (field: Prisma.Sql) => Prisma.sql`to_char(${field}, 'YYYY-MM-DD')`;
  const timestamp = (date: Date) => Prisma.sql`${date.toISOString()}::timestamp`;
  const knownAt = timestamp(knownThrough);
  const timed = Prisma.sql`
    to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') ||
    to_char("createdAt", '"T"YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  `;
  const createdInRange = Prisma.sql`
    "createdAt" >= ${timestamp(start)} AND "createdAt" < ${timestamp(end)} AND "createdAt" <= ${knownAt}
  `;
  const calendarRange = (field: Prisma.Sql, known = createdAt) =>
    Prisma.sql`${field} BETWEEN ${from}::date AND ${to}::date AND ${known} <= ${knownAt}`;
  const sources = [
    { source: "stock", table: Prisma.sql`"StockMovement"`, rowId, at: timed, range: createdInRange },
    { source: "production", table: Prisma.sql`"Production"`, rowId, at: dated(Prisma.sql`date`),
      range: calendarRange(Prisma.sql`date`) },
    { source: "sale", table: Prisma.sql`"DailySale"`, rowId, at: dated(Prisma.sql`"serviceDate"`),
      range: calendarRange(Prisma.sql`"serviceDate"`, Prisma.sql`"updatedAt"`) },
    { source: "service", table: Prisma.sql`"ServiceDay"`, rowId: dated(Prisma.sql`"serviceDate"`), at: dated(Prisma.sql`"serviceDate"`),
      range: calendarRange(Prisma.sql`"serviceDate"`, Prisma.sql`"updatedAt"`) },
    { source: "recipe", table: Prisma.sql`"RecipeVersion"`, rowId, at: dated(Prisma.sql`"effectiveFrom"`),
      range: Prisma.sql`(${calendarRange(Prisma.sql`"effectiveFrom"`)} OR ("effectiveFrom" IS NULL AND "createdAt" <= ${knownAt}))` },
    { source: "mapping", table: Prisma.sql`"SaleItemRecipeMapping"`, rowId, at: dated(Prisma.sql`"effectiveFrom"`),
      range: calendarRange(Prisma.sql`"effectiveFrom"`) },
    { source: "decision", table: Prisma.sql`"RecommendationDecision"`, rowId, at: timed, range: createdInRange },
    { source: "document", table: Prisma.sql`"WorkspaceDocument"`, rowId: Prisma.sql`kind`,
      at: Prisma.sql`CASE WHEN ${documentDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN ${documentDate} END`,
      range: Prisma.sql`(kind LIKE 'source-invoice:%' OR kind LIKE 'invoice:%')
        AND (${documentDate} IS NULL OR ${documentDate} BETWEEN ${from} AND ${to}) AND "updatedAt" <= ${knownAt}` },
    { source: "purchase-order", table: Prisma.sql`"PurchaseOrder"`, rowId, at: timed, range: createdInRange },
    { source: "purchase-receipt", table: Prisma.sql`"PurchaseReceipt"`, rowId, at: dated(Prisma.sql`"deliveryDate"`),
      range: calendarRange(Prisma.sql`"deliveryDate"`) },
  ];
  const queries = sources.map(({ source, table, rowId, at, range }) => Prisma.sql`
    SELECT ${source}::text AS source, ${rowId} AS "rowId", ${source} || ':' || ${rowId} AS id, COALESCE(${at}, '~') AS at
    FROM ${table}
    WHERE "restaurantId" = ${restaurantId} AND ${range}
  `);
  // Sort by Paris day, then UTC instant (including the repeated autumn hour), with unknown dates last.
  return db.$queryRaw<TimelineKey[]>(Prisma.sql`
    SELECT source, "rowId", id, at FROM (${Prisma.join(queries, " UNION ALL ")}) AS events
    ${cursor ? Prisma.sql`WHERE (at COLLATE "C", id COLLATE "C") > (${cursor.at}::text, ${cursor.id}::text)` : Prisma.empty}
    ORDER BY at COLLATE "C", id COLLATE "C"
    LIMIT ${take}
  `);
}
