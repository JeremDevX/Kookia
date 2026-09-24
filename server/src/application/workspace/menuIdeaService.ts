import { Prisma, type PrismaClient, type Prisma as PrismaTypes } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { evaluateMenuRecipeIdea, type MenuRecipeCandidate, type MenuStockAvailability,
  type MenuSurplusLabel } from "./menuIdeasPolicy.js";

type MenuDatabase = PrismaClient | Prisma.TransactionClient;
type SurplusSelection = { productId: string; stockCountId: string; expectedStockRevision: number; quantity: number };
export interface MenuIdeasInput { operationId: string; surplus: SurplusSelection[] }

const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const countOrder = [{ countedAt: "desc" as const }, { id: "desc" as const }];
const isCurrentCount = (count: { stockRevisionAfter: number; countedQuantity: Prisma.Decimal; unit: string } | undefined,
  product: { stockRevision: number; currentStock: Prisma.Decimal; unit: string }) => !!count &&
  count.stockRevisionAfter === product.stockRevision && count.unit === product.unit && count.countedQuantity.equals(product.currentStock);

export async function getMenuSurplusOptions(restaurantId: string, db: MenuDatabase = prisma) {
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  if (!restaurant || restaurant.mode !== "demo") return { available: false as const, options: [] };
  const products = await db.product.findMany({ where: { restaurantId }, orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { stockCounts: { orderBy: countOrder, take: 1 } } });
  const options = products.flatMap((product) => {
    const count = product.stockCounts[0];
    if (!isCurrentCount(count, product) || !count.countedQuantity.greaterThan(0)) return [];
    return [{ productId: product.id, productName: product.name, unit: product.unit,
      countedQuantity: Number(count.countedQuantity), stockCountId: count.id,
      stockRevision: product.stockRevision, countedAt: count.countedAt.toISOString() }];
  });
  return { available: true as const, options };
}

function storedResultSchema() {
  return z.object({ provenance: z.literal("demo_simulation"), asOfDate: z.iso.date(),
    emptyReason: z.string().nullable(), ideas: z.array(z.object({
      recipeId: z.string(), recipeName: z.string(), category: z.enum(["Entrée", "Plat", "Dessert"]),
      version: z.number().int().positive(), effectiveFrom: z.iso.date(), status: z.enum(["feasible", "not_feasible"]),
      maximumPortions: z.number().int().positive().nullable(),
      surplusProducts: z.array(z.object({ productId: z.string(), productName: z.string(), quantity: z.number(), unit: z.string() })),
      blockers: z.array(z.string()), expiryStatus: z.literal("unknown"),
    }).strict()) }).strict();
}

function snapshotJson(value: unknown): PrismaTypes.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as PrismaTypes.InputJsonValue;
}

export async function createMenuIdeas(restaurantId: string, actorId: string, input: MenuIdeasInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId } });
    if (prior) {
      if (prior.decision !== "menu_ideas_generated") throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération a déjà servi à une autre décision.");
      const saved = z.object({ input: z.object({ surplus: z.array(z.object({ productId: z.string(), stockCountId: z.string(),
        expectedStockRevision: z.number().int(), quantity: z.number() }).strict()) }), result: storedResultSchema() }).strict().parse(prior.snapshot);
      if (JSON.stringify(saved.input) !== JSON.stringify({ surplus: input.surplus }))
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de menu a déjà été utilisée avec un autre surstock.");
      return { ...saved.result, replayed: true };
    }

    const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
    if (restaurant?.mode !== "demo") throw new WorkspaceError(409, "DEMO_ONLY", "Les idées à partir d’un surstock sont réservées au bac de démonstration.");
    const today = todayParis();
    const productIds = input.surplus.map((selection) => selection.productId);
    const surplusProductIds = new Set(productIds);
    const eligibleVersions = await tx.recipeVersion.findMany({
      where: { restaurantId, effectiveFrom: { lte: date(today) } },
      select: { id: true, recipeId: true, version: true, effectiveFrom: true,
        ingredients: { select: { productId: true } } },
    });
    const latestEligible = new Map<string, typeof eligibleVersions[number]>();
    eligibleVersions.sort((left, right) => (right.effectiveFrom?.getTime() ?? 0) - (left.effectiveFrom?.getTime() ?? 0) ||
      right.version - left.version).forEach((version) => {
      if (!latestEligible.has(version.recipeId)) latestEligible.set(version.recipeId, version);
    });
    const candidateVersions = [...latestEligible.values()].filter((version) =>
      version.ingredients.some((ingredient) => surplusProductIds.has(ingredient.productId)));
    const lockedProductIds = new Set(productIds);
    candidateVersions.forEach((version) => version.ingredients.forEach((ingredient) => lockedProductIds.add(ingredient.productId)));
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId}
      AND id IN (${Prisma.join([...lockedProductIds].sort())}) ORDER BY id FOR UPDATE`);

    const products = await tx.product.findMany({ where: { restaurantId, id: { in: productIds } },
      include: { stockCounts: { orderBy: countOrder, take: 1 } } });
    if (products.length !== productIds.length) throw new WorkspaceError(404, "NOT_FOUND", "Un produit de surstock est introuvable dans cet espace.");
    const productById = new Map(products.map((product) => [product.id, product]));
    const labels: MenuSurplusLabel[] = input.surplus.map((selection) => {
      const product = productById.get(selection.productId)!;
      const count = product.stockCounts[0];
      if (!count || count.id !== selection.stockCountId || !isCurrentCount(count, product) ||
          selection.expectedStockRevision !== product.stockRevision) {
        throw new WorkspaceError(409, "STOCK_COUNT_STALE", `Le comptage de ${product.name} n’est plus actuel. Rechargez les stocks.`);
      }
      if (selection.quantity > Number(count.countedQuantity))
        throw new WorkspaceError(400, "SURPLUS_EXCEEDS_COUNT", `La quantité de ${product.name} dépasse le dernier comptage.`);
      if (product.unit === "pcs" && !Number.isInteger(selection.quantity))
        throw new WorkspaceError(400, "INVALID_SURPLUS_UNIT", `La quantité de ${product.name} doit être un nombre entier de pièces.`);
      return { productId: product.id, productName: product.name, unit: product.unit, quantity: selection.quantity };
    });

    const versions = await tx.recipeVersion.findMany({
      where: { restaurantId, id: { in: candidateVersions.map((version) => version.id) } },
      include: { ingredients: { include: { product: { select: { id: true, name: true, unit: true,
        currentStock: true, stockRevision: true, stockCounts: { orderBy: countOrder, take: 1 } } } } } },
    });
    const versionByRecipeId = new Map(versions.map((version) => [version.recipeId, version]));
    const recipes: MenuRecipeCandidate[] = versions.flatMap((version) => {
      if (!version.effectiveFrom || !["Entrée", "Plat", "Dessert"].includes(version.category) || !version.ingredients.length ||
          !version.ingredients.some((ingredient) => surplusProductIds.has(ingredient.productId))) return [];
      return [{ recipeId: version.recipeId, recipeName: version.name, category: version.category as MenuRecipeCandidate["category"],
        version: version.version, effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        yieldPortions: version.yieldPortions, ingredients: version.ingredients.map((ingredient) => ({
          productId: ingredient.productId, productName: ingredient.productName, unit: ingredient.productUnit,
          quantity: Number(ingredient.quantity),
        })) }];
    });
    const ideas = recipes.flatMap((recipe) => {
      const version = versionByRecipeId.get(recipe.recipeId)!;
      const inventory: MenuStockAvailability[] = version.ingredients.map((ingredient) => {
        const product = ingredient.product;
        const count = product.stockCounts[0];
        return { productId: product.id, productName: product.name, unit: product.unit,
          quantity: isCurrentCount(count, product) ? Number(product.currentStock) : null };
      });
      const idea = evaluateMenuRecipeIdea(recipe, labels, inventory);
      return idea ? [idea] : [];
    }).sort((left, right) => Number(right.status === "feasible") - Number(left.status === "feasible") ||
      left.recipeName.localeCompare(right.recipeName, "fr"));
    const result = storedResultSchema().parse({ provenance: "demo_simulation", asOfDate: today,
      emptyReason: ideas.length ? null : "Aucune recette datée n’utilise le surstock sélectionné.", ideas });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "menu_ideas_generated", snapshot: snapshotJson({ input: { surplus: input.surplus }, result }) } });
    return { ...result, replayed: false };
  });
}
