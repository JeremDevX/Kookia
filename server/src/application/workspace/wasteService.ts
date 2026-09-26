import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { recordLotMovement } from "./lotService.js";

export interface WasteInput {
  operationId: string; serviceDate: string; serviceSlot?: string | null;
  kind: "raw" | "preparation" | "unsold" | "plate_return";
  avoidability: "avoidable" | "inedible"; productId?: string; lotId?: string; productionId?: string;
  quantity: number; unit: string; note: string;
}
export function wasteDeductsStock(kind: WasteInput["kind"], productionId?: string) {
  return kind === "raw" || (kind === "preparation" && !productionId);
}
const dto = (row: Awaited<ReturnType<typeof prisma.wasteRecord.findMany>>[number]) => ({
  ...row, quantity: Number(row.quantity), serviceDate: row.serviceDate.toISOString().slice(0, 10), createdAt: row.createdAt.toISOString(),
});
export async function listWaste(restaurantId: string) {
  const records = await prisma.wasteRecord.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 500 });
  const allocations = await prisma.stockLotAllocation.findMany({ where: { restaurantId, stockMovementId: { in: records.flatMap((row) => row.stockMovementId ? [row.stockMovementId] : []) } }, include: { lot: true } });
  return records.map((row) => {
    const sources = allocations.filter((entry) => entry.stockMovementId === row.stockMovementId);
    const valued = sources.length > 0 && sources.every((entry) => entry.lot.unitCost !== null);
    return { ...dto(row), valuation: valued ? "lot_cost" : "not_valued", cost: valued ? sources.reduce((sum, entry) => sum + Number(entry.quantity) * Number(entry.lot.unitCost), 0) : null };
  });
}
export async function recordWaste(restaurantId: string, actorId: string, input: WasteInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.wasteRecord.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    const snapshot = { ...input, serviceSlot: input.serviceSlot ?? null, productId: input.productId ?? null,
      lotId: input.lotId ?? null, productionId: input.productionId ?? null };
    if (prior) {
      const previous = { operationId: prior.operationId, serviceDate: prior.serviceDate.toISOString().slice(0, 10),
        serviceSlot: prior.serviceSlot, productId: prior.productId, lotId: prior.lotId, productionId: prior.productionId,
        kind: prior.kind, avoidability: prior.avoidability, quantity: Number(prior.quantity), unit: prior.unit, note: prior.note };
      if (!isDeepStrictEqual(previous, snapshot)) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette déclaration de perte existe avec d’autres valeurs.");
      return dto(prior);
    }
    const production = input.productionId ? await tx.production.findFirst({ where: { restaurantId, id: input.productionId }, include: { recipeVersion: { include: { ingredients: true } } } }) : null;
    if (input.productionId && (!production || production.kind !== "production"))
      throw new WorkspaceError(400, "INVALID_PRODUCTION", "La perte doit être liée à une préparation validée de votre espace.");
    if ((input.kind === "unsold" || input.kind === "plate_return") && !production)
      throw new WorkspaceError(400, "PRODUCTION_REQUIRED", "L’invendu ou le retour doit être lié à une préparation validée.");
    if (production && input.kind === "raw") throw new WorkspaceError(400, "INVALID_RAW_WASTE", "Une perte brute doit être liée à un produit, pas à une préparation.");
    if (production && input.kind !== "preparation" && !Number.isInteger(input.quantity)) throw new WorkspaceError(400, "INVALID_PORTIONS", "La quantité de portions doit être entière.");
    if (production && input.kind !== "preparation" && (input.unit !== "portion" || input.productId || input.lotId))
      throw new WorkspaceError(400, "INVALID_PREPARED_WASTE", "Une perte de préparation est exprimée en portions, sans nouvelle sortie de matières.");
    if (production && production.serviceSlot && input.serviceSlot && production.serviceSlot !== input.serviceSlot)
      throw new WorkspaceError(400, "PRODUCTION_SERVICE_MISMATCH", "La perte doit conserver le service de la préparation liée.");
    if (production && input.serviceDate < production.date.toISOString().slice(0, 10))
      throw new WorkspaceError(400, "WASTE_PRECEDES_PRODUCTION", "La perte ne peut pas précéder la préparation.");
    if (production && input.kind === "preparation") {
      const ingredient = production.recipeVersion?.ingredients.find((row) => row.productId === input.productId);
      if (!ingredient || ingredient.productUnit !== input.unit) throw new WorkspaceError(400, "INVALID_PREPARATION_INGREDIENT", "La parure doit correspondre à un ingrédient et son unité dans la version produite.");
      if (ingredient.productUnit === "pcs" && !Number.isInteger(input.quantity)) throw new WorkspaceError(400, "INVALID_QUANTITY", "La quantité en pièces doit être entière.");
      const priorLosses = await tx.wasteRecord.aggregate({ where: { restaurantId, productionId: production.id, kind: "preparation", productId: input.productId }, _sum: { quantity: true } });
      const gross = ingredient.quantity.mul(production.portions).div(production.recipeVersion!.yieldPortions);
      const maximum = ingredient.netQuantity == null ? gross : ingredient.quantity.minus(ingredient.netQuantity).mul(production.portions).div(production.recipeVersion!.yieldPortions);
      if (new Prisma.Decimal(input.quantity).plus(priorLosses._sum.quantity ?? 0).greaterThan(maximum)) throw new WorkspaceError(409, "PREPARATION_WASTE_EXCEEDS_YIELD", "Les parures cumulées dépassent la matière brute disponible ou l’écart brut/net renseigné.");
      if (input.lotId) {
        const allocation = await tx.stockLotAllocation.findFirst({ where: { restaurantId, lotId: input.lotId, stockMovement: { operationId: production.operationId, productId: input.productId } } });
        if (!allocation) throw new WorkspaceError(400, "INVALID_LOT", "Ce lot n’a pas été utilisé pour cet ingrédient dans la préparation.");
      }
    }
    if (production && input.kind !== "preparation") {
      const previous = await tx.wasteRecord.aggregate({ where: { restaurantId, productionId: production.id, kind: { in: ["unsold", "plate_return"] } }, _sum: { quantity: true } });
      if (new Prisma.Decimal(input.quantity).plus(previous._sum.quantity ?? 0).greaterThan(production.portions))
        throw new WorkspaceError(409, "WASTE_EXCEEDS_PRODUCTION", "Les pertes cumulées dépassent les portions préparées.");
    }
    let stockMovementId: string | null = null;
    if (wasteDeductsStock(input.kind, input.productionId)) {
      if (!input.productId) throw new WorkspaceError(400, "PRODUCT_REQUIRED", "Sélectionnez le produit perdu.");
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId} AND id = ${input.productId} FOR UPDATE`);
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: input.productId } } });
      if (!product || product.unit !== input.unit) throw new WorkspaceError(400, "INVALID_PRODUCT_UNIT", "Le produit et son unité doivent appartenir à votre stock.");
      if (product.unit === "pcs" && !Number.isInteger(input.quantity)) throw new WorkspaceError(400, "INVALID_QUANTITY", "La quantité en pièces doit être entière.");
      if (product.currentStock.lessThan(input.quantity)) throw new WorkspaceError(409, "INSUFFICIENT_STOCK", "Le stock est insuffisant.");
      const movement = await tx.stockMovement.create({ data: { restaurantId, actorId, productId: product.id,
        delta: new Prisma.Decimal(input.quantity).negated(), reason: "loss", operationId: input.operationId,
        serviceSlot: input.serviceSlot ?? null, productNameSnapshot: product.name, productUnitSnapshot: product.unit } });
      await recordLotMovement(tx, restaurantId, product.id, product.currentStock, movement, actorId, undefined, input.lotId);
      await tx.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } }, data: {
        currentStock: { decrement: input.quantity }, stockRevision: { increment: 1 } } });
      stockMovementId = movement.id;
    }
    const row = await tx.wasteRecord.create({ data: { ...snapshot, restaurantId, actorId, stockMovementId,
      serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`) } });
    return dto(row);
  });
}
