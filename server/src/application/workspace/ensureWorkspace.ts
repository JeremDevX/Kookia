import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { appendRecipeVersion } from "./recipeVersionStorage.js";
import catalog from "../../infrastructure/database/seed/catalog.json" with { type: "json" };

// Seed only once per account. The complete graph is committed atomically.
export async function ensureWorkspace(ownerId: string) {
  const existing = await prisma.restaurant.findUnique({ where: { ownerId } });
  if (existing) return existing;
  try {
    return await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({ data: {
        ownerId, name: "La Pizzeria de Camille", type: "Pizzeria / Crêperie",
        address: "12 Rue de Grenoble, 38000 Grenoble", city: "Grenoble",
        phone: "+33 1 23 45 67 89", email: "contact@example.com", dailyCovers: 350,
      } });
      const restaurantId = restaurant.id;
      await tx.supplier.createMany({ data: catalog.suppliers.map((supplier) => ({ ...supplier, restaurantId })) });
      await tx.product.createMany({ data: catalog.products.map((product) => ({
        ...product, restaurantId,
        lastDelivery: null,
      })) });
      const productsById = new Map(catalog.products.map((product) => [product.id, product]));
      for (const recipe of catalog.recipes) {
        await tx.recipe.create({ data: {
          id: recipe.id, restaurantId, name: recipe.name, category: recipe.category,
          prepTime: recipe.prepTime, lastMade: recipe.lastMade ? new Date(recipe.lastMade) : null,
        } });
        await tx.recipeIngredient.createMany({ data: recipe.ingredients.map((ingredient) => ({
          ...ingredient, restaurantId, recipeId: recipe.id,
        })) });
        await appendRecipeVersion(tx, { restaurantId, recipeId: recipe.id, version: 1, effectiveFrom: null,
          operationId: `workspace-seed:recipe:${recipe.id}:v1`, actorId: "workspace-seed:v1",
          name: recipe.name, category: recipe.category, prepTime: recipe.prepTime, yieldPortions: 1,
          ingredients: recipe.ingredients.map((ingredient) => {
            const product = productsById.get(ingredient.productId)!;
            return { productId: ingredient.productId, productName: product.name, productUnit: product.unit,
              quantity: new Prisma.Decimal(ingredient.quantity) };
          }) });
      }
      await tx.prediction.createMany({ data: catalog.predictions.map((prediction) => ({
        id: prediction.id, restaurantId, productId: prediction.productId,
        predictedDate: new Date(prediction.predictedDate),
        predictedConsumption: prediction.predictedConsumption, confidence: prediction.confidence,
        action: prediction.recommendation?.action, quantity: prediction.recommendation?.quantity,
        reason: prediction.recommendation?.reason,
      })) });
      await tx.workspaceDocument.createMany({ data: [
        { restaurantId, kind: "analytics", data: catalog.analytics },
        { restaurantId, kind: "activity", data: catalog.activity },
      ] });
      return restaurant;
    });
  } catch (error) {
    // Concurrent first requests may race on the owner unique constraint.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.restaurant.findUnique({ where: { ownerId } });
      if (winner) return winner;
    }
    throw error;
  }
}
