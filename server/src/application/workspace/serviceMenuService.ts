import { Prisma, type PrismaClient } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import type { MenuEntry, MenuInput, ServiceMenu } from "../../../../shared/serviceOperations.js";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";

type Database = PrismaClient | Prisma.TransactionClient;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
export const menuDto = (row: { id: string; serviceDate: Date; slot: string; revision: number; entries: Prisma.JsonValue; note: string; createdAt: Date }): ServiceMenu => ({
  id: row.id, serviceDate: row.serviceDate.toISOString().slice(0, 10), slot: row.slot as ServiceSlot,
  revision: row.revision, entries: row.entries as unknown as MenuEntry[], note: row.note, createdAt: row.createdAt.toISOString(),
});
export async function getServiceMenu(restaurantId: string, serviceDate: string, slot: ServiceSlot, db: Database = prisma): Promise<ServiceMenu> {
  const menu = await db.serviceMenuVersion.findFirst({ where: { restaurantId, serviceDate: date(serviceDate), slot }, orderBy: { revision: "desc" } });
  return menu ? menuDto(menu) : { id: null, serviceDate, slot, revision: 0, entries: [], note: "", createdAt: null };
}
export async function saveServiceMenu(restaurantId: string, actorId: string, input: MenuInput) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const replay = await tx.serviceMenuVersion.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    if (replay) {
      const decision = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId, decision: "service_menu_saved" } });
      if (!isDeepStrictEqual(decision?.snapshot, input))
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée pour une autre carte.");
      return menuDto(replay);
    }
    const current = await getServiceMenu(restaurantId, input.serviceDate, input.slot, tx);
    if (current.revision !== input.expectedRevision) throw new WorkspaceError(409, "REVISION_CONFLICT", "La carte a changé. Rechargez-la.");
    const saleIds = input.entries.flatMap(e => e.saleItemId ? [e.saleItemId] : []);
    const saleCount = await tx.saleItem.count({ where: { restaurantId, id: { in: saleIds } } });
    if (saleCount !== saleIds.length) throw new WorkspaceError(400, "INVALID_SALE_ITEM", "Article de vente absent du restaurant.");
    const ids = [...new Set(input.entries.flatMap(e => e.components.map(c => c.recipeId)))];
    const versions = await tx.recipeVersion.findMany({ where: { restaurantId, recipeId: { in: ids }, effectiveFrom: { lte: date(input.serviceDate) } },
      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }], include: { ingredients: true } });
    const entries: MenuEntry[] = input.entries.map(entry => ({ ...entry, components: entry.components.map(component => {
      const version = versions.find(v => v.recipeId === component.recipeId);
      if (!version) throw new WorkspaceError(400, "RECIPE_VERSION_MISSING", "Une recette n'a pas de version datée applicable à ce service.");
      if (entry.category !== "Formule" && version.category !== entry.category)
        throw new WorkspaceError(400, "CATEGORY_MISMATCH", "La catégorie de l'article doit correspondre à sa recette.");
      return { ...component, recipeName: version.name, recipeVersionId: version.id, recipeVersion: version.version,
        category: version.category, yieldPortions: version.yieldPortions, ingredients: version.ingredients.map(i => ({
          productId: i.productId, productName: i.productName, unit: i.productUnit, quantity: Number(i.quantity) })) };
    }) }));
    const result = await tx.serviceMenuVersion.create({ data: { restaurantId, actorId, operationId: input.operationId,
      serviceDate: date(input.serviceDate), slot: input.slot, revision: current.revision + 1, note: input.note,
      entries: entries as unknown as Prisma.InputJsonValue } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "service_menu_saved", snapshot: input as unknown as Prisma.InputJsonValue } });
    return menuDto(result);
  });
}
