import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { evaluateSalesBaseline } from "./salesBaseline.js";
import { evaluateSalesForecastContext } from "./salesForecastContext.js";

type BaselineDatabase = PrismaClient | Prisma.TransactionClient;

const parisDate = (date: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

export const previousParisDay = () => new Date(Date.parse(parisDate(new Date())) - 86_400_000).toISOString().slice(0, 10);

export async function getSalesBaseline(restaurantId: string, asOfDate = previousParisDay(), db: BaselineDatabase = prisma) {
  const historyFrom = new Date(Date.parse(asOfDate) - 27 * 86_400_000).toISOString().slice(0, 10);
  const start = new Date(`${historyFrom}T00:00:00Z`), end = new Date(`${asOfDate}T00:00:00Z`);
  const [rows, serviceDays] = await Promise.all([
    db.dailySale.findMany({ where: { restaurantId, source: { in: ["manual", "csv", "pos", "ticket_z", "demo_simulation"] },
      serviceDate: { gte: start, lte: end } }, include: { saleItem: { select: { name: true } } } }),
    db.serviceDay.findMany({ where: { restaurantId, serviceDate: { gte: start, lte: end } },
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
    knownAt: parisDate(mapping.createdAt), portionsPerItem: Number(mapping.portionsPerItem) })),
  versions.map((version) => ({ recipeId: version.recipeId, version: version.version,
    effectiveFrom: version.effectiveFrom?.toISOString().slice(0, 10) ?? null, knownAt: parisDate(version.createdAt),
    name: version.name, yieldPortions: version.yieldPortions, ingredients: version.ingredients.map((ingredient) => ({
      productId: ingredient.productId, productName: ingredient.productName, unit: ingredient.productUnit,
      quantity: Number(ingredient.quantity),
    })) })));
  return { ...baseline, contextualForecast: evaluateSalesForecastContext(baseline, null, new Date()) };
}
