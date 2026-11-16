import type { Prisma, PrismaClient } from "@prisma/client";
import { addCalendarDays } from "../../../../shared/calendarDate.js";
import { formatParisDate } from "../../../../shared/parisDate.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { evaluateSalesBaseline, salesBaselineHistoryFrom } from "./salesBaseline.js";
import { evaluateSalesForecastContext } from "./salesForecastContext.js";

type BaselineDatabase = PrismaClient | Prisma.TransactionClient;

const salesBaselineRange = (asOfDate: string) => ({
  gte: new Date(`${salesBaselineHistoryFrom(asOfDate)}T00:00:00Z`),
  lte: new Date(`${asOfDate}T00:00:00Z`),
});

export const previousParisDay = () => addCalendarDays(formatParisDate(), -1);

export function countCompleteSalesBaselineDays(restaurantId: string, asOfDate: string, db: BaselineDatabase) {
  return db.serviceDay.count({ where: { restaurantId, serviceDate: salesBaselineRange(asOfDate), coverage: "complete" } });
}

export async function getSalesBaseline(restaurantId: string, asOfDate = previousParisDay(), db: BaselineDatabase = prisma) {
  const serviceDate = salesBaselineRange(asOfDate);
  const [rows, serviceDays] = await Promise.all([
    db.dailySale.findMany({ where: { restaurantId, source: { in: ["manual", "csv", "pos", "ticket_z", "demo_simulation"] },
      serviceDate }, include: { saleItem: { select: { name: true } } } }),
    db.serviceDay.findMany({ where: { restaurantId, serviceDate },
      select: { serviceDate: true, status: true, coverage: true, source: true } }),
  ]);
  const saleItemIds = [...new Set(rows.map((row) => row.saleItemId))];
  const mappings = saleItemIds.length ? await db.saleItemRecipeMapping.findMany({
    where: { restaurantId, saleItemId: { in: saleItemIds } },
  }) : [];
  const recipeIds = [...new Set(mappings.map((mapping) => mapping.recipeId))];
  const versions = recipeIds.length ? await db.recipeVersion.findMany({
    where: { restaurantId, recipeId: { in: recipeIds } }, include: { ingredients: true },
  }) : [];
  const baseline = evaluateSalesBaseline(rows.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
    saleItemId: row.saleItemId, saleItemName: row.saleItem.name, quantity: row.quantity,
    source: row.source === "demo_simulation" ? "demo_simulation" as const : row.source === "csv" ? "csv" as const : row.source === "pos" ? "pos" as const : row.source === "ticket_z" ? "ticket_z" as const : "manual" as const })),
  serviceDays.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
    status: row.status, coverage: row.coverage, source: row.source })), asOfDate,
  mappings.map((mapping) => ({ saleItemId: mapping.saleItemId, recipeId: mapping.recipeId,
    revision: mapping.revision, effectiveFrom: mapping.effectiveFrom.toISOString().slice(0, 10),
    knownAt: formatParisDate(mapping.createdAt), portionsPerItem: Number(mapping.portionsPerItem) })),
  versions.map((version) => ({ recipeId: version.recipeId, version: version.version,
    effectiveFrom: version.effectiveFrom?.toISOString().slice(0, 10) ?? null, knownAt: formatParisDate(version.createdAt),
    name: version.name, yieldPortions: version.yieldPortions, ingredients: version.ingredients.map((ingredient) => ({
      productId: ingredient.productId, productName: ingredient.productName, unit: ingredient.productUnit,
      quantity: Number(ingredient.quantity),
    })) })));
  return { ...baseline, contextualForecast: evaluateSalesForecastContext(baseline, null, new Date()) };
}
