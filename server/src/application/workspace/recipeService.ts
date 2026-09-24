import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { appendRecipeVersion, findRecipeVersionForDate } from "./recipeVersionStorage.js";

const recipeInclude = {
  ingredients: { include: { product: { select: { id: true, name: true, unit: true } } } },
  versions: { orderBy: { version: "desc" }, include: { ingredients: true } },
} satisfies Prisma.RecipeInclude;
type RecipeWithVersions = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;

export interface RecipeIngredientInput { productId: string; quantity: number }
export interface RecipeValues {
  name: string; category: string; prepTime: number; yieldPortions: number; effectiveFrom: string;
  ingredients: RecipeIngredientInput[];
}
export interface ProductionInput {
  operationId: string; recipeId?: string; expectedRecipeRevision?: number; recipeName: string; portions: number;
  prepTime: number; notes: string; date: string; kind: "production" | "record" | "refusal";
}

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const parisToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const lockWorkspace = (tx: Prisma.TransactionClient, restaurantId: string) =>
  tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);

function versionDto(version: RecipeWithVersions["versions"][number]) {
  return { version: version.version, effectiveFrom: version.effectiveFrom?.toISOString().slice(0, 10) ?? null,
    actorId: version.actorId, createdAt: version.createdAt.toISOString(), name: version.name,
    category: version.category, prepTime: version.prepTime, yieldPortions: version.yieldPortions,
    ingredients: version.ingredients.map(({ productId, productName, productUnit, quantity }) =>
      ({ productId, productName, unit: productUnit, quantity: Number(quantity) })) };
}

function recipeDto(recipe: RecipeWithVersions) {
  const version = recipe.versions[0];
  const legacyIngredients = recipe.ingredients.map(({ productId, product, quantity }) =>
    ({ productId, productName: product.name, unit: product.unit, quantity: Number(quantity) }));
  return { id: recipe.id, name: version?.name ?? recipe.name, category: version?.category ?? recipe.category,
    prepTime: version?.prepTime ?? recipe.prepTime, yieldPortions: version?.yieldPortions ?? recipe.yieldPortions,
    revision: recipe.revision, version: version?.version ?? recipe.revision,
    effectiveFrom: version?.effectiveFrom?.toISOString().slice(0, 10) ?? null,
    ingredients: version?.ingredients.map(({ productId, productName, productUnit, quantity }) =>
      ({ productId, productName, unit: productUnit, quantity: Number(quantity) })) ?? legacyIngredients,
    versions: recipe.versions.map(versionDto),
    ...(recipe.lastMade ? { lastMade: recipe.lastMade.toISOString() } : {}) };
}

export async function getRecipes(restaurantId: string) {
  const recipes = await prisma.recipe.findMany({ where: { restaurantId }, include: recipeInclude, orderBy: { id: "asc" } });
  return recipes.map(recipeDto);
}

async function productsForIngredients(tx: Prisma.TransactionClient, restaurantId: string, ingredients: RecipeIngredientInput[]) {
  if (new Set(ingredients.map((ingredient) => ingredient.productId)).size !== ingredients.length)
    throw new WorkspaceError(400, "DUPLICATE_RECIPE_INGREDIENT", "Un produit ne peut apparaître qu’une fois dans la recette.");
  const ids = ingredients.map((ingredient) => ingredient.productId);
  const products = ids.length ? await tx.product.findMany({ where: { restaurantId, id: { in: ids } },
    select: { id: true, name: true, unit: true } }) : [];
  if (products.length !== ids.length) throw new WorkspaceError(400, "INVALID_RECIPE_PRODUCT", "Chaque ingrédient doit être un produit de votre espace.");
  const byId = new Map(products.map((product) => [product.id, product]));
  return ingredients.map((ingredient) => {
    const product = byId.get(ingredient.productId)!;
    if (product.unit === "pcs" && !Number.isInteger(ingredient.quantity))
      throw new WorkspaceError(400, "INVALID_RECIPE_UNIT", "Un ingrédient compté en pièces doit avoir une quantité entière.");
    return { ...ingredient, product };
  });
}

function snapshotIngredients(ingredients: Awaited<ReturnType<typeof productsForIngredients>>) {
  return ingredients.map(({ productId, quantity, product }) => ({ productId, quantity: new Prisma.Decimal(quantity.toFixed(3)),
    productName: product.name, productUnit: product.unit }));
}

function sameSnapshot(version: { name: string; category: string; prepTime: number; yieldPortions: number;
  effectiveFrom: Date | null; ingredients: Array<{ productId: string; quantity: Prisma.Decimal }> }, input: RecipeValues) {
  const saved = version.ingredients.map((ingredient) => `${ingredient.productId}:${ingredient.quantity.toFixed(3)}`).sort();
  const requested = input.ingredients.map((ingredient) => `${ingredient.productId}:${ingredient.quantity.toFixed(3)}`).sort();
  return version.name === input.name && version.category === input.category && version.prepTime === input.prepTime &&
    version.yieldPortions === input.yieldPortions && version.effectiveFrom?.toISOString().slice(0, 10) === input.effectiveFrom &&
    saved.length === requested.length && saved.every((value, index) => value === requested[index]);
}

function assertEffectiveDate(input: RecipeValues, latest: { effectiveFrom: Date | null } | null) {
  if (input.effectiveFrom > parisToday()) throw new WorkspaceError(400, "FUTURE_RECIPE_DATE", "La date d’effet ne peut pas être future.");
  if (latest?.effectiveFrom && date(input.effectiveFrom) < latest.effectiveFrom)
    throw new WorkspaceError(409, "RECIPE_DATE_ORDER", "Une nouvelle version ne peut pas précéder la dernière version datée.");
}

function versionData(restaurantId: string, recipeId: string, version: number, actorId: string, operationId: string,
  input: RecipeValues, ingredients: Awaited<ReturnType<typeof productsForIngredients>>) {
  return { restaurantId, recipeId, version, effectiveFrom: date(input.effectiveFrom), operationId, actorId,
    name: input.name, category: input.category, prepTime: input.prepTime, yieldPortions: input.yieldPortions,
    ingredients: snapshotIngredients(ingredients) };
}

export async function createRecipe(restaurantId: string, actorId: string, operationId: string, input: RecipeValues) {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    const replay = await tx.recipeVersion.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } }, include: { ingredients: true } });
    if (replay) {
      if (!sameSnapshot(replay, input)) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de recette existe déjà avec un autre contenu.");
      return recipeDto(await tx.recipe.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: replay.recipeId } }, include: recipeInclude }));
    }
    assertEffectiveDate(input, null);
    const ingredients = await productsForIngredients(tx, restaurantId, input.ingredients);
    const id = randomUUID();
    await tx.recipe.create({ data: { id, restaurantId, name: input.name, category: input.category,
      prepTime: input.prepTime, yieldPortions: input.yieldPortions, revision: 1 } });
    if (ingredients.length) await tx.recipeIngredient.createMany({ data: ingredients.map(({ productId, quantity }) => ({
      restaurantId, recipeId: id, productId, quantity: new Prisma.Decimal(quantity.toFixed(3)),
    })) });
    await appendRecipeVersion(tx, versionData(restaurantId, id, 1, actorId, operationId, input, ingredients));
    return recipeDto(await tx.recipe.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id } }, include: recipeInclude }));
  });
}

export async function updateRecipe(restaurantId: string, actorId: string, id: string, expectedRevision: number,
  operationId: string, input: RecipeValues) {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    const replay = await tx.recipeVersion.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } }, include: { ingredients: true } });
    if (replay) {
      if (replay.recipeId !== id || !sameSnapshot(replay, input))
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette opération de recette existe déjà avec un autre contenu.");
      return recipeDto(await tx.recipe.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id } }, include: recipeInclude }));
    }
    const current = await tx.recipe.findUnique({ where: { restaurantId_id: { restaurantId, id } } });
    if (!current) throw new WorkspaceError(404, "NOT_FOUND", "Recette introuvable.");
    if (current.revision !== expectedRevision) throw new WorkspaceError(409, "REVISION_CONFLICT", "La recette a changé ; rechargez-la avant de la modifier.");
    const latest = await tx.recipeVersion.findFirst({ where: { restaurantId, recipeId: id }, orderBy: { version: "desc" } });
    assertEffectiveDate(input, latest);
    const ingredients = await productsForIngredients(tx, restaurantId, input.ingredients);
    const revision = current.revision + 1;
    await tx.recipe.update({ where: { restaurantId_id: { restaurantId, id } }, data: {
      name: input.name, category: input.category, prepTime: input.prepTime,
      yieldPortions: input.yieldPortions, revision,
    } });
    await tx.recipeIngredient.deleteMany({ where: { restaurantId, recipeId: id } });
    if (ingredients.length) await tx.recipeIngredient.createMany({ data: ingredients.map(({ productId, quantity }) => ({
      restaurantId, recipeId: id, productId, quantity: new Prisma.Decimal(quantity.toFixed(3)),
    })) });
    await appendRecipeVersion(tx, versionData(restaurantId, id, revision, actorId, operationId, input, ingredients));
    return recipeDto(await tx.recipe.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id } }, include: recipeInclude }));
  });
}

export async function recordProduction(restaurantId: string, actorId: string, input: ProductionInput) {
  return prisma.$transaction(async (tx) => {
    await lockWorkspace(tx, restaurantId);
    const prior = await tx.production.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } },
      include: { recipeVersion: { select: { version: true, effectiveFrom: true, yieldPortions: true } } } });
    if (prior) {
      if (prior.recipeId !== (input.recipeId ?? null) || prior.portions !== input.portions || prior.kind !== input.kind ||
        prior.date.toISOString().slice(0, 10) !== input.date || prior.notes !== input.notes ||
        (!prior.recipeId && (prior.recipeName !== input.recipeName || prior.prepTime !== input.prepTime)) ||
        (prior.recipeId && prior.recipeVersion && prior.recipeVersion.version !== input.expectedRecipeRevision) ||
        (prior.recipeId && !prior.recipeVersion && (prior.recipeName !== input.recipeName || prior.prepTime !== input.prepTime))) {
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée.");
      }
      return prior;
    }
    const recipe = input.recipeId ? await tx.recipe.findUnique({ where: { restaurantId_id: { restaurantId, id: input.recipeId } } }) : null;
    if (input.recipeId && !recipe) throw new WorkspaceError(404, "NOT_FOUND", "Recette introuvable.");
    const recipeVersion = recipe ? await findRecipeVersionForDate(tx, restaurantId, recipe.id, date(input.date)) : null;
    if (recipe && !recipeVersion) throw new WorkspaceError(409, "RECIPE_VERSION_MISSING", "Aucune version de recette n’est applicable à cette date.");
    if (recipe && recipeVersion?.version !== input.expectedRecipeRevision)
      throw new WorkspaceError(409, "RECIPE_REVISION_CONFLICT", "La version applicable a changé ; rechargez la recette.");
    if (input.kind === "production") {
      if (!recipeVersion?.ingredients.length || recipeVersion.ingredients.some((ingredient) => !ingredient.quantity.greaterThan(0))) {
        throw new WorkspaceError(400, "INVALID_RECIPE", "Une recette avec des quantités d’ingrédients positives est nécessaire.");
      }
      for (const ingredient of [...recipeVersion.ingredients].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const rawAmount = ingredient.quantity.mul(input.portions).div(recipeVersion.yieldPortions);
        if (ingredient.productUnit === "pcs" && !rawAmount.isInteger())
          throw new WorkspaceError(400, "INVALID_RECIPE_PRECISION", "Le rendement demandé génère une fraction de pièce ; ajustez les portions.");
        const amount = rawAmount
          .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
        if (!amount.greaterThan(0)) throw new WorkspaceError(400, "INVALID_RECIPE_PRECISION", "La quantité par portion est inférieure à la précision de stock (0,001 unité).");
        const updated = await tx.product.updateMany({
          where: { restaurantId, id: ingredient.productId, currentStock: { gte: amount } },
          data: { currentStock: { decrement: amount }, stockRevision: { increment: 1 } },
        });
        if (!updated.count) throw new WorkspaceError(409, "INSUFFICIENT_STOCK", "Stock insuffisant : ajustez les portions et réessayez.");
        await tx.stockMovement.create({ data: {
          restaurantId, productId: ingredient.productId, delta: amount.negated(), reason: "production",
          actorId, operationId: input.operationId,
          productNameSnapshot: ingredient.productName, productUnitSnapshot: ingredient.productUnit,
        } });
      }
    }
    if (recipe && input.kind !== "refusal") {
      await tx.recipe.updateMany({ where: { restaurantId, id: recipe.id,
        OR: [{ lastMade: null }, { lastMade: { lt: date(input.date) } }] }, data: { lastMade: date(input.date) } });
    }
    const productionInput = { operationId: input.operationId, recipeId: input.recipeId,
      recipeName: input.recipeName, portions: input.portions, prepTime: input.prepTime,
      notes: input.notes, date: input.date, kind: input.kind };
    const production = await tx.production.create({ data: { ...productionInput, restaurantId, actorId,
      recipeVersionId: recipeVersion?.id ?? null, recipeName: recipeVersion?.name ?? input.recipeName,
      prepTime: recipeVersion?.prepTime ?? input.prepTime, date: date(input.date),
    }, include: { recipeVersion: { select: { version: true, effectiveFrom: true, yieldPortions: true } } } });
    return production;
  });
}
