import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
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
          lastDelivery: state.lastDelivery ? new Date(`${state.lastDelivery}T00:00:00.000Z`) : null },
      });
    }

    const recipeIds = recipes.map((recipe) => recipe.id);
    await tx.recipeIngredient.deleteMany({ where: { restaurantId, recipeId: { in: recipeIds } } });
    for (const recipe of recipes) await tx.recipe.update({
      where: { restaurantId_id: { restaurantId, id: recipe.id } },
      data: { lastMade: recipe.lastMade ? new Date(`${recipe.lastMade}T00:00:00.000Z`) : null },
    });
    await insertBatches(recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ({
      restaurantId, recipeId: recipe.id, productId: ingredient.productId, quantity: ingredient.quantity,
    }))), (batch) => tx.recipeIngredient.createMany({ data: batch }));

    await insertBatches(plan.movements.map((movement) => ({
      id: stableUuid(`${movement.operationId}:${movement.productId}`), restaurantId, productId: movement.productId,
      delta: movement.delta, reason: movement.reason, operationId: movement.operationId,
      actorId: SIMULATION_MARKER, createdAt: new Date(movement.at),
    } satisfies Prisma.StockMovementCreateManyInput)), (batch) => tx.stockMovement.createMany({ data: batch }));

    await insertBatches(plan.productions.map((production) => ({
      id: production.id, restaurantId, recipeId: production.recipeId, recipeName: production.recipeName,
      portions: production.portions, prepTime: production.prepTime, notes: production.notes,
      date: new Date(`${production.date}T00:00:00.000Z`), kind: "production", actorId: SIMULATION_MARKER,
      operationId: production.operationId, createdAt: new Date(production.createdAt),
    } satisfies Prisma.ProductionCreateManyInput)), (batch) => tx.production.createMany({ data: batch }));

    await tx.saleItem.createMany({ data: saleItems.map((sale) => ({
      id: sale.itemId, restaurantId, name: sale.itemName, normalizedName: normalizeName(sale.itemName),
    })) });
    await insertBatches(plan.sales.map((sale) => ({
      id: sale.id, restaurantId, saleItemId: sale.itemId,
      serviceDate: new Date(`${sale.date}T00:00:00.000Z`), quantity: sale.quantity,
      source: "demo_simulation", operationId: sale.operationId, createdBy: SIMULATION_MARKER,
      updatedBy: SIMULATION_MARKER, createdAt: new Date(sale.createdAt), updatedAt: new Date(sale.createdAt),
    } satisfies Prisma.DailySaleCreateManyInput)), (batch) => tx.dailySale.createMany({ data: batch }));

    const marker = JSON.parse(JSON.stringify({
      version: SIMULATION_VERSION, sourceDigest: plan.sourceDigest,
      counts: plan.counts, yearCoverage: plan.yearCoverage, productState: plan.productState,
      receiptConversions: plan.receipts,
      recipeDigest: digestRecipePlan(recipes), saleItemIds: saleItems.map((sale) => sale.itemId), createdSupplierIds,
      startDate: plan.startDate, endDate: plan.endDate,
    })) as Prisma.InputJsonValue;
    await tx.workspaceDocument.create({ data: { restaurantId, kind: SIMULATION_MARKER, data: marker } });
  }, { maxWait: 20_000, timeout: 300_000 });

  return { createdSupplierIds, saleItemIds: saleItems.map((sale) => sale.itemId) };
}
