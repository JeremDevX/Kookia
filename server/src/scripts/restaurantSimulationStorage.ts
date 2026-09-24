import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { appendRecipeVersion } from "../application/workspace/recipeVersionStorage.js";
import { digestRecipePlan } from "./restaurantSimulationSupport.js";
import {
  SIMULATION_MARKER, SIMULATION_VERSION, stableUuid,
} from "./restaurantSimulationPlan.js";
import { sourceInvoiceSupplierId } from "./restaurantSimulationReceipts.js";
import type { PlannedRecipe } from "./restaurantSimulationSupport.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";

type SimulationPlan = ReturnType<typeof import("./restaurantSimulationPlan.js").buildRestaurantSimulation>;

function chunks<T>(items: T[], size = 500) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function insertBatches<T>(items: T[], insert: (batch: T[]) => Promise<unknown>) {
  for (const batch of chunks(items)) await insert(batch);
}

const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");

export async function applyRestaurantSimulation(restaurantId: string, plan: SimulationPlan, recipes: PlannedRecipe[],
  oldProductIds: string[], legacyMovementIds: string[], existingSupplierIds: Set<string>) {
  const stateById = new Map(plan.productState.map((product) => [product.id, product]));
  const supplierNames = new Map<string, string>();
  for (const receipt of plan.receipts) supplierNames.set(sourceInvoiceSupplierId(receipt.supplier), receipt.supplier.slice(0, 120));
  for (const state of plan.productState) if (state.supplierId?.startsWith("simulation-v1-")) {
    supplierNames.set(state.supplierId, state.supplierName ?? "Approvisionnement synthétique (aucune commande)");
  }
  const createdSupplierIds = [...supplierNames.keys()].filter((id) => !existingSupplierIds.has(id));
  const saleItems = plan.sales.filter((sale, index, all) => all.findIndex((candidate) => candidate.itemId === sale.itemId) === index);

  await prisma.$transaction(async (tx) => {
    const serviceDateValues = plan.serviceDays.map((serviceDate) => new Date(serviceDate + "T00:00:00.000Z"));
    const existingServiceDays = await tx.serviceDay.count({
      where: { restaurantId, serviceDate: { in: serviceDateValues } },
    });
    if (existingServiceDays) throw new Error("Calendrier déjà renseigné sur la période ; la simulation exige des dates libres.");
    if (legacyMovementIds.length) await tx.stockMovement.deleteMany({ where: { restaurantId, id: { in: legacyMovementIds } } });
    if (oldProductIds.length) await tx.product.deleteMany({ where: { restaurantId, id: { in: oldProductIds } } });

    for (const [id, name] of supplierNames) await tx.supplier.upsert({
      where: { restaurantId_id: { restaurantId, id } },
      create: { restaurantId, id, name, email: "", phone: "" },
      update: {},
    });

    for (const product of scenarioProducts) {
      const state = stateById.get(product.id)!;
      await tx.product.upsert({
        where: { restaurantId_id: { restaurantId, id: product.id } },
        create: { restaurantId, id: product.id, name: product.name, category: product.category, unit: product.unit,
          currentStock: state.closing, minThreshold: product.minThreshold, pricePerUnit: state.pricePerUnit,
          supplierId: state.supplierId!, lastDelivery: state.lastDelivery ? new Date(`${state.lastDelivery}T00:00:00.000Z`) : null },
        update: { name: product.name, category: product.category, unit: product.unit, currentStock: state.closing,
          minThreshold: product.minThreshold, pricePerUnit: state.pricePerUnit, supplierId: state.supplierId!,
          lastDelivery: state.lastDelivery ? new Date(`${state.lastDelivery}T00:00:00.000Z`) : null,
          stockRevision: { increment: 1 } },
      });
    }

    const recipeIds = recipes.map((recipe) => recipe.id);
    const currentRecipes = await tx.recipe.findMany({ where: { restaurantId, id: { in: recipeIds } },
      select: { id: true, revision: true } });
    if (currentRecipes.length !== recipeIds.length) throw new Error("Une recette du scénario est absente de l’espace.");
    const currentRecipeById = new Map(currentRecipes.map((recipe) => [recipe.id, recipe]));
    const ingredientProductIds = [...new Set(recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.productId)))];
    const ingredientProducts = await tx.product.findMany({ where: { restaurantId, id: { in: ingredientProductIds } },
      select: { id: true, name: true, unit: true } });
    const ingredientProductById = new Map(ingredientProducts.map((product) => [product.id, product]));
    if (ingredientProducts.length !== ingredientProductIds.length) throw new Error("Un produit ingrédient du scénario est absent de l’espace.");
    await tx.recipeIngredient.deleteMany({ where: { restaurantId, recipeId: { in: recipeIds } } });
    const recipeVersionIds = new Map<string, string>();
    const recipeRevisionById: Record<string, number> = {};
    for (const recipe of recipes) await tx.recipe.update({
      where: { restaurantId_id: { restaurantId, id: recipe.id } },
      data: { name: recipe.name, category: recipe.category, prepTime: recipe.prepTime,
        lastMade: recipe.lastMade ? new Date(`${recipe.lastMade}T00:00:00.000Z`) : null,
        yieldPortions: 1, revision: { increment: 1 } },
    });
    for (const recipe of recipes) {
      const version = currentRecipeById.get(recipe.id)!.revision + 1;
      const savedVersion = await appendRecipeVersion(tx, { restaurantId, recipeId: recipe.id, version,
        effectiveFrom: new Date(`${plan.startDate}T00:00:00.000Z`),
        createdAt: new Date(`${plan.startDate}T00:00:00.000Z`),
        operationId: `${SIMULATION_VERSION}:recipe:${recipe.id}:v${version}`, actorId: SIMULATION_MARKER,
        name: recipe.name, category: recipe.category, prepTime: recipe.prepTime, yieldPortions: 1,
        ingredients: recipe.ingredients.map((ingredient) => {
          const product = ingredientProductById.get(ingredient.productId)!;
          return { productId: ingredient.productId, productName: product.name, productUnit: product.unit,
            quantity: new Prisma.Decimal(ingredient.quantity) };
        }) });
      recipeVersionIds.set(recipe.id, savedVersion.id);
      recipeRevisionById[recipe.id] = version;
    }
    await insertBatches(recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ({
      restaurantId, recipeId: recipe.id, productId: ingredient.productId, quantity: ingredient.quantity,
    }))), (batch) => tx.recipeIngredient.createMany({ data: batch }));

    const simulationProductsById = new Map(scenarioProducts.map((product) => [product.id, product]));
    await insertBatches(plan.movements.map((movement) => {
      const product = simulationProductsById.get(movement.productId);
      if (!product) throw new Error(`Produit du scénario introuvable : ${movement.productId}.`);
      return {
      id: stableUuid(`${movement.operationId}:${movement.productId}`), restaurantId, productId: movement.productId,
      delta: movement.delta, reason: movement.reason, operationId: movement.operationId,
      productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: movement.supplierName ?? null,
      actorId: SIMULATION_MARKER, createdAt: new Date(movement.at),
    } satisfies Prisma.StockMovementCreateManyInput;
    }), (batch) => tx.stockMovement.createMany({ data: batch }));

    await insertBatches(plan.productions.map((production) => ({
      id: production.id, restaurantId, recipeId: production.recipeId, recipeName: production.recipeName,
      portions: production.portions, prepTime: production.prepTime, notes: production.notes,
      date: new Date(`${production.date}T00:00:00.000Z`), kind: "production", actorId: SIMULATION_MARKER,
      operationId: production.operationId, createdAt: new Date(production.createdAt),
      recipeVersionId: recipeVersionIds.get(production.recipeId)!,
    } satisfies Prisma.ProductionCreateManyInput)), (batch) => tx.production.createMany({ data: batch }));

    await tx.saleItem.createMany({ data: saleItems.map((sale) => ({
      id: sale.itemId, restaurantId, name: sale.itemName, normalizedName: normalizeName(sale.itemName),
    })) });
    await tx.serviceDay.createMany({ data: plan.serviceDays.map((serviceDate) => ({
      restaurantId, serviceDate: new Date(serviceDate + "T00:00:00.000Z"),
      status: "open", coverage: "complete", source: "demo_simulation", actorId: SIMULATION_MARKER,
      createdAt: new Date(serviceDate + "T00:00:00.000Z"), updatedAt: new Date(serviceDate + "T00:00:00.000Z"),
    })) });
    const contributionBySale = new Map(plan.sales.map((sale) => [sale.id, stableUuid(`${sale.operationId}:contribution`)]));
    await insertBatches(plan.sales.map((sale) => ({
      id: contributionBySale.get(sale.id)!, restaurantId, source: "demo_simulation" as const,
      sourceKey: sale.operationId, sourceRevision: 1, sourceItemName: sale.itemName, sourceDate: sale.date,
      serviceDate: new Date(`${sale.date}T00:00:00.000Z`), sourceQuantity: String(sale.quantity), quantity: sale.quantity,
      saleItemId: sale.itemId, status: "accepted" as const, reviewRevision: 1,
      reviewedBy: SIMULATION_MARKER, reviewedAt: new Date(sale.createdAt),
      reviewReason: "Vente synthétique marquée comme démonstration.", createdAt: new Date(sale.createdAt),
    } satisfies Prisma.SaleContributionCreateManyInput)), (batch) => tx.saleContribution.createMany({ data: batch }));
    await insertBatches(plan.sales.map((sale) => ({
      id: stableUuid(`${sale.operationId}:contribution-event`), restaurantId,
      contributionId: contributionBySale.get(sale.id)!, operationId: `simulation:${sale.operationId}`,
      revision: 1, kind: "accepted" as const, actorId: SIMULATION_MARKER,
      reason: "Vente synthétique marquée comme démonstration.",
      snapshot: { sourceItemName: sale.itemName, sourceDate: sale.date, quantity: sale.quantity,
        source: "demo_simulation" } as Prisma.InputJsonObject, createdAt: new Date(sale.createdAt),
    } satisfies Prisma.SaleContributionEventCreateManyInput)), (batch) => tx.saleContributionEvent.createMany({ data: batch }));
    await insertBatches(plan.sales.map((sale) => ({
      id: sale.id, restaurantId, saleItemId: sale.itemId,
      serviceDate: new Date(`${sale.date}T00:00:00.000Z`), quantity: sale.quantity,
      source: "demo_simulation", operationId: sale.operationId, createdBy: SIMULATION_MARKER,
      updatedBy: SIMULATION_MARKER, contributionId: contributionBySale.get(sale.id)!,
      createdAt: new Date(sale.createdAt), updatedAt: new Date(sale.createdAt),
    } satisfies Prisma.DailySaleCreateManyInput)), (batch) => tx.dailySale.createMany({ data: batch }));

    const marker = JSON.parse(JSON.stringify({
      version: SIMULATION_VERSION, sourceDigest: plan.sourceDigest,
      counts: plan.counts, yearCoverage: plan.yearCoverage, productState: plan.productState,
      receiptConversions: plan.receipts,
      recipeDigest: digestRecipePlan(recipes), recipeVersionIds: [...recipeVersionIds.values()], recipeRevisionById,
      saleItemIds: saleItems.map((sale) => sale.itemId), createdSupplierIds,
      startDate: plan.startDate, endDate: plan.endDate,
    })) as Prisma.InputJsonValue;
    await tx.workspaceDocument.create({ data: { restaurantId, kind: SIMULATION_MARKER, data: marker } });
  }, { maxWait: 20_000, timeout: 300_000 });

  return { createdSupplierIds, saleItemIds: saleItems.map((sale) => sale.itemId) };
}
