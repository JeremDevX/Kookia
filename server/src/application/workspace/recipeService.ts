import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export async function getRecipes(restaurantId: string) {
  const recipes = await prisma.recipe.findMany({ where: { restaurantId }, include: { ingredients: true }, orderBy: { id: "asc" } });
  return recipes.map(({ id, name, category, prepTime, lastMade, ingredients }) => ({
    id, name, category, prepTime, ...(lastMade ? { lastMade: lastMade.toISOString() } : {}),
    ingredients: ingredients.map(({ productId, quantity }) => ({ productId, quantity: Number(quantity) })),
  }));
}

export interface ProductionInput {
  operationId: string; recipeId?: string; recipeName: string; portions: number;
  prepTime: number; notes: string; date: string; kind: "production" | "record" | "refusal";
}

export async function recordProduction(restaurantId: string, actorId: string, input: ProductionInput) {
  return prisma.$transaction(async (tx) => {
    // One workspace operation at a time prevents duplicate submissions and locks ingredients consistently.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const prior = await tx.production.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId: input.operationId } } });
    if (prior) {
      if (prior.recipeId !== (input.recipeId ?? null) || prior.portions !== input.portions || prior.kind !== input.kind ||
        prior.date.toISOString().slice(0, 10) !== input.date || prior.prepTime !== input.prepTime || prior.notes !== input.notes ||
        (!prior.recipeId && prior.recipeName !== input.recipeName)) {
        throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée.");
      }
      return prior;
    }
    const recipe = input.recipeId ? await tx.recipe.findUnique({
      where: { restaurantId_id: { restaurantId, id: input.recipeId } }, include: { ingredients: true },
    }) : null;
    if (input.recipeId && !recipe) throw new WorkspaceError(404, "NOT_FOUND", "Recette introuvable.");
    if (input.kind === "production") {
      if (!recipe || !recipe.ingredients.length || recipe.ingredients.some((ingredient) => !ingredient.quantity.greaterThan(0))) {
        throw new WorkspaceError(400, "INVALID_RECIPE", "Une recette avec des quantités d’ingrédients positives est nécessaire.");
      }
      for (const ingredient of [...recipe.ingredients].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const amount = ingredient.quantity.mul(input.portions);
        const updated = await tx.product.updateMany({
          where: { restaurantId, id: ingredient.productId, currentStock: { gte: amount } },
          data: { currentStock: { decrement: amount } },
        });
        if (!updated.count) throw new WorkspaceError(409, "INSUFFICIENT_STOCK", "Stock insuffisant : ajustez les portions et réessayez.");
        await tx.stockMovement.create({ data: {
          restaurantId, productId: ingredient.productId, delta: amount.negated(), reason: "production",
          actorId, operationId: input.operationId,
        } });
      }
    }
    if (recipe && input.kind !== "refusal") {
      // Backdated records must not move the latest production date backwards.
      await tx.recipe.updateMany({ where: { restaurantId, id: recipe.id, OR: [{ lastMade: null }, { lastMade: { lt: new Date(input.date) } }] }, data: { lastMade: new Date(input.date) } });
    }
    return tx.production.create({ data: {
      ...input, restaurantId, actorId, recipeName: recipe?.name ?? input.recipeName,
      date: new Date(input.date),
    } });
  });
}
