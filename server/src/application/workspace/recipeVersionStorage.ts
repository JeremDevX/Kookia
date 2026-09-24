import { Prisma } from "@prisma/client";

export interface RecipeVersionSnapshot {
  restaurantId: string;
  recipeId: string;
  version: number;
  effectiveFrom: Date | null;
  operationId: string;
  actorId: string;
  name: string;
  category: string;
  prepTime: number;
  yieldPortions: number;
  createdAt?: Date;
  ingredients: Array<{ productId: string; productName: string; productUnit: string; quantity: Prisma.Decimal }>;
}

export async function appendRecipeVersion(tx: Prisma.TransactionClient, snapshot: RecipeVersionSnapshot) {
  const { ingredients, ...version } = snapshot;
  const saved = await tx.recipeVersion.create({ data: version });
  await tx.recipeVersionIngredient.createMany({ data: ingredients.map((ingredient) => ({
    restaurantId: snapshot.restaurantId, recipeVersionId: saved.id, ...ingredient,
  })) });
  return saved;
}

export function findRecipeVersionForDate(tx: Prisma.TransactionClient, restaurantId: string, recipeId: string, date: Date) {
  return tx.recipeVersion.findFirst({ where: { restaurantId, recipeId,
    OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: date } }],
  }, orderBy: [{ effectiveFrom: { sort: "desc", nulls: "last" } }, { version: "desc" }], include: { ingredients: true } });
}
