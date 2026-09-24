import { Prisma, type SaleItemRecipeMapping as SaleItemRecipeMappingRecord } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { lockSalesWorkspace } from "./salesContributionLedger.js";
import { findRecipeVersionForDate } from "./recipeVersionStorage.js";

export interface SaleRecipeMappingValues {
  saleItemId: string;
  recipeId: string;
  expectedRevision: number;
  operationId: string;
  effectiveFrom: string;
  portionsPerItem: number;
}

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
type MappingRow = SaleItemRecipeMappingRecord;

function mappingDto(mapping: MappingRow) {
  return { id: mapping.id, saleItemId: mapping.saleItemId, recipeId: mapping.recipeId,
    recipeName: mapping.recipeName, revision: mapping.revision,
    effectiveFrom: mapping.effectiveFrom.toISOString().slice(0, 10),
    portionsPerItem: Number(mapping.portionsPerItem), actorId: mapping.actorId,
    createdAt: mapping.createdAt.toISOString() };
}

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

export async function listSaleRecipeMappings(restaurantId: string) {
  const [items, recipes, mappings] = await Promise.all([
    prisma.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.recipe.findMany({ where: { restaurantId }, select: { id: true, name: true } }),
    prisma.saleItemRecipeMapping.findMany({ where: { restaurantId },
      orderBy: [{ saleItemId: "asc" }, { revision: "desc" }] }),
  ]);
  const recipeNames = new Map<string, string[]>();
  for (const recipe of recipes) {
    const key = normalizedName(recipe.name);
    recipeNames.set(key, [...(recipeNames.get(key) ?? []), recipe.id]);
  }
  const byItem = new Map<string, MappingRow[]>();
  for (const mapping of mappings) byItem.set(mapping.saleItemId, [...(byItem.get(mapping.saleItemId) ?? []), mapping]);
  return items.map((item) => {
    const history = byItem.get(item.id) ?? [];
    const exactMatches = recipeNames.get(normalizedName(item.name)) ?? [];
    return { id: item.id, name: item.name, revision: history[0]?.revision ?? 0,
      suggestedRecipeId: exactMatches.length === 1 ? exactMatches[0] : null,
      mappings: history.map(mappingDto) };
  });
}

function sameOperation(mapping: MappingRow, input: SaleRecipeMappingValues) {
  return mapping.saleItemId === input.saleItemId && mapping.recipeId === input.recipeId &&
    mapping.effectiveFrom.getTime() === date(input.effectiveFrom).getTime() &&
    Number(mapping.portionsPerItem) === input.portionsPerItem;
}

export async function createSaleRecipeMapping(restaurantId: string, actorId: string, input: SaleRecipeMappingValues) {
  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const prior = await tx.saleItemRecipeMapping.findUnique({
      where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } },
    });
    if (prior) {
      if (sameOperation(prior, input)) return { ...mappingDto(prior), replayed: true };
      throw new WorkspaceError(409, "MAPPING_OPERATION_CONFLICT", "Cette opération correspond déjà à une autre correspondance.");
    }

    const [item, recipe, latest] = await Promise.all([
      tx.saleItem.findUnique({ where: { restaurantId_id: { restaurantId, id: input.saleItemId } }, select: { id: true } }),
      tx.recipe.findUnique({ where: { restaurantId_id: { restaurantId, id: input.recipeId } }, select: { id: true } }),
      tx.saleItemRecipeMapping.findFirst({ where: { restaurantId, saleItemId: input.saleItemId }, orderBy: { revision: "desc" } }),
    ]);
    if (!item) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "Article vendu introuvable dans votre espace.");
    if (!recipe) throw new WorkspaceError(400, "INVALID_RECIPE", "Recette introuvable dans votre espace.");
    if ((latest?.revision ?? 0) !== input.expectedRevision)
      throw new WorkspaceError(409, "MAPPING_REVISION_CONFLICT", "La correspondance a changé. Rechargez la liste avant de valider.");
    if (latest && date(input.effectiveFrom) <= latest.effectiveFrom)
      throw new WorkspaceError(409, "MAPPING_DATE_CONFLICT", "Une nouvelle correspondance doit prendre effet après la version précédente.");

    const recipeVersion = await findRecipeVersionForDate(tx, restaurantId, input.recipeId, date(input.effectiveFrom));
    if (!recipeVersion || recipeVersion.effectiveFrom === null)
      throw new WorkspaceError(409, "RECIPE_VERSION_UNDATED", "Datez d’abord une version de cette recette au plus tard à la date d’effet choisie.");

    const mapping = await tx.saleItemRecipeMapping.create({ data: { restaurantId, saleItemId: input.saleItemId,
      recipeId: input.recipeId, revision: (latest?.revision ?? 0) + 1, effectiveFrom: date(input.effectiveFrom),
      recipeName: recipeVersion.name, portionsPerItem: new Prisma.Decimal(input.portionsPerItem), operationId: input.operationId, actorId } });
    return { ...mappingDto(mapping), replayed: false };
  });
}
