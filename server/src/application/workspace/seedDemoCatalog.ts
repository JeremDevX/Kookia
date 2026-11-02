import { Prisma } from "@prisma/client";
import { appendRecipeVersion } from "./recipeVersionStorage.js";
import catalog from "../../infrastructure/database/seed/catalog.json" with { type: "json" };

export async function seedDemoCatalog(tx: Prisma.TransactionClient, restaurantId: string) {
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
}
