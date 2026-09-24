import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { digestRecipePlan, type PlannedRecipe } from "./restaurantSimulationSupport.js";
import { SIMULATION_MARKER, SIMULATION_VERSION } from "./restaurantSimulationPlan.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";
import type { RestaurantSimulationBackup } from "./restaurantSimulationBackup.js";

const backupArgument = process.argv.indexOf("--backup");
const backupPath = backupArgument >= 0 ? process.argv[backupArgument + 1] : undefined;
const database = new URL(env.DATABASE_URL);
if (!backupPath || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Rollback refusé : fournissez --backup et utilisez uniquement la base locale kookia.");
}
const backup = JSON.parse(readFileSync(backupPath, "utf8")) as RestaurantSimulationBackup;
if (backup.formatVersion !== 1 || backup.targetRestaurant !== "La Pizzeria de Camille" || !backup.restaurantId ||
  !backup.sourceDigest || !Array.isArray(backup.products) || !Array.isArray(backup.stockMovements) ||
  !Array.isArray(backup.recipes) || !Array.isArray(backup.recipeIngredients)) {
  throw new Error("Le fichier n’est pas une sauvegarde ciblée de la simulation Kookia.");
}

interface SavedProduct {
  id: string; restaurantId: string; name: string; category: string; currentStock: string | number;
  unit: string; minThreshold: string | number; supplierId: string; pricePerUnit: string | number; lastDelivery: string | null;
}
interface SavedMovement {
  id: string; restaurantId: string; productId: string; delta: string | number; reason: string;
  operationId: string; actorId: string; createdAt: string;
}
interface SavedRecipe { id: string; restaurantId: string; name: string; category: string; prepTime: number; lastMade: string | null }
interface SavedIngredient { restaurantId: string; recipeId: string; productId: string; quantity: string | number }
const savedProducts = backup.products as SavedProduct[];
const savedMovements = backup.stockMovements as SavedMovement[];
const savedRecipes = backup.recipes as SavedRecipe[];
const savedIngredients = backup.recipeIngredients as SavedIngredient[];
const simulationProductIds = scenarioProducts.map((product) => product.id);
const syntheticProductIds = scenarioProducts.filter((product) => product.id.startsWith("simulation-v1-product-")).map((product) => product.id);
const savedRecipeIds = (backup.recipes as Array<{ id: string }>).map((recipe) => recipe.id);
const batch = async <T>(items: T[], insert: (items: T[]) => Promise<unknown>) => {
  for (let index = 0; index < items.length; index += 500) await insert(items.slice(index, index + 500));
};

try {
  await prisma.$connect();
  const [{ name: databaseName }] = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`SELECT current_database() AS name`);
  if (databaseName !== "kookia") throw new Error("Rollback refusé : la base active n’est pas kookia.");
  const { restaurantId } = await resolveCamilleRestaurantId();
  if (restaurantId !== backup.restaurantId) throw new Error("La sauvegarde appartient à un autre espace ; aucune écriture effectuée.");
  const markerRow = await prisma.workspaceDocument.findUnique({
    where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } }, select: { data: true },
  });
  const marker = markerRow?.data as { version?: string; sourceDigest?: string; counts?: Record<string, number>;
    productState?: Array<Record<string, unknown>>; recipeDigest?: string; saleItemIds?: string[] } | undefined;
  if (!markerRow || marker?.version !== SIMULATION_VERSION || marker.sourceDigest !== backup.sourceDigest ||
    !marker.counts || !marker.productState || !marker.recipeDigest || !marker.saleItemIds) {
    throw new Error("La simulation active ne correspond pas à cette sauvegarde ; aucune écriture effectuée.");
  }
  await assertNoHumanChanges(restaurantId, marker);

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    await tx.dailySale.deleteMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.production.deleteMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.stockMovement.deleteMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.workspaceDocument.delete({ where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } } });

    const remainingSales = await tx.dailySale.count({ where: { restaurantId, saleItemId: { in: marker.saleItemIds } } });
    if (remainingSales) throw new Error("Une vente manuelle utilise un article simulé ; rollback arrêté sans modifier son contenu.");
    await tx.saleItem.deleteMany({ where: { restaurantId, id: { in: marker.saleItemIds } } });
    await tx.recipeIngredient.deleteMany({ where: { restaurantId, recipeId: { in: savedRecipeIds } } });

    const purchaseRefs = syntheticProductIds.length ? await tx.purchaseOrderLine.count({
      where: { productId: { in: syntheticProductIds }, order: { restaurantId } },
    }) : 0;
    const predictionRefs = syntheticProductIds.length ? await tx.prediction.count({
      where: { restaurantId, productId: { in: syntheticProductIds } },
    }) : 0;
    if (purchaseRefs || predictionRefs) throw new Error("Un produit de scénario est référencé depuis l’import ; rollback arrêté.");
    if (syntheticProductIds.length) await tx.product.deleteMany({ where: { restaurantId, id: { in: syntheticProductIds } } });

    for (const recipe of savedRecipes) await tx.recipe.update({
      where: { restaurantId_id: { restaurantId, id: recipe.id } },
      data: { name: recipe.name, category: recipe.category, prepTime: recipe.prepTime,
        lastMade: recipe.lastMade ? new Date(recipe.lastMade) : null },
    });
    await batch(savedIngredients, (rows) => tx.recipeIngredient.createMany({ data: rows.map((row) => ({
      ...row, quantity: new Prisma.Decimal(row.quantity),
    })) }));

    for (const product of savedProducts) {
      const data = { name: product.name, category: product.category,
        currentStock: new Prisma.Decimal(product.currentStock), unit: product.unit,
        minThreshold: new Prisma.Decimal(product.minThreshold), supplierId: product.supplierId,
        pricePerUnit: new Prisma.Decimal(product.pricePerUnit),
        lastDelivery: product.lastDelivery ? new Date(product.lastDelivery) : null };
      await tx.product.upsert({ where: { restaurantId_id: { restaurantId, id: product.id } },
        create: { restaurantId, id: product.id, ...data }, update: { ...data, stockRevision: { increment: 1 } } });
    }
    await batch(savedMovements, (rows) => tx.stockMovement.createMany({ data: rows.map((row) => ({
      ...row, delta: new Prisma.Decimal(row.delta), createdAt: new Date(row.createdAt),
    })) }));

    for (const supplierId of backup.createdSupplierIds ?? []) {
      const references = await tx.product.count({ where: { restaurantId, supplierId } });
      if (!references) await tx.supplier.deleteMany({ where: { restaurantId, id: supplierId } });
    }
  }, { maxWait: 20_000, timeout: 300_000 });

  console.info(JSON.stringify({ target: backup.targetRestaurant, mode: "restored",
    restoredProducts: savedProducts.length, restoredLegacyMovements: savedMovements.length,
    restoredRecipes: savedRecipes.length, sourceDocumentsPreserved: true }, null, 2));
} finally {
  await prisma.$disconnect();
}

type ActiveMarker = { version?: string; sourceDigest?: string; counts?: Record<string, number>;
  productState?: Array<Record<string, unknown>>; recipeDigest?: string; saleItemIds?: string[] };

async function assertNoHumanChanges(restaurantId: string, marker: ActiveMarker) {
  const [movementCount, productionCount, saleCount, unrelatedMovements, unrelatedProductions, currentProducts, currentRecipes] = await Promise.all([
    prisma.stockMovement.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    prisma.production.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    prisma.dailySale.count({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    prisma.stockMovement.count({ where: { restaurantId, productId: { in: simulationProductIds }, NOT: { operationId: { startsWith: `${SIMULATION_VERSION}:` } } } }),
    prisma.production.count({ where: { restaurantId, recipeId: { in: savedRecipeIds }, NOT: { operationId: { startsWith: `${SIMULATION_VERSION}:` } } } }),
    prisma.product.findMany({ where: { restaurantId, id: { in: simulationProductIds } } }),
    prisma.recipe.findMany({ where: { restaurantId }, include: { ingredients: { orderBy: { productId: "asc" } } }, orderBy: { id: "asc" } }),
  ]);
  if (movementCount !== marker.counts?.stockMovements || productionCount !== marker.counts?.productions ||
    saleCount !== marker.counts?.sales || unrelatedMovements || unrelatedProductions) {
    throw new Error("Des mouvements manuels ou un scénario incomplet existent ; rollback arrêté pour préserver les saisies.");
  }
  const [generatedSales, generatedProductions] = await Promise.all([
    prisma.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { createdBy: true, updatedBy: true, revision: true } }),
    prisma.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { actorId: true } }),
  ]);
  if (generatedSales.some((sale) => sale.createdBy !== SIMULATION_MARKER || sale.updatedBy !== SIMULATION_MARKER || sale.revision !== 0) ||
    generatedProductions.some((production) => production.actorId !== SIMULATION_MARKER)) {
    throw new Error("Une vente ou production simulée a été modifiée dans l’application ; rollback arrêté pour préserver la saisie.");
  }
  const currentById = new Map(currentProducts.map((product) => [product.id, product]));
  for (const state of marker.productState ?? []) {
    const spec = scenarioProducts.find((product) => product.id === state.id)!;
    const product = currentById.get(String(state.id));
    const lastDelivery = product?.lastDelivery?.toISOString().slice(0, 10) ?? null;
    if (!product || product.name !== spec.name || product.category !== spec.category || product.unit !== state.unit ||
      Math.abs(Number(product.currentStock) - Number(state.closing)) > 0.0005 ||
      Math.abs(Number(product.minThreshold) - Number(state.minThreshold)) > 0.0005 ||
      Math.abs(Number(product.pricePerUnit) - Number(state.pricePerUnit)) > 0.00005 ||
      product.supplierId !== state.supplierId || lastDelivery !== (state.lastDelivery ?? null)) {
      throw new Error("Un produit a été modifié depuis l’import ; rollback arrêté sans écraser cette saisie.");
    }
  }
  const digest = digestRecipePlan(currentRecipes.map((recipe): PlannedRecipe => ({ id: recipe.id, name: recipe.name,
    category: recipe.category, prepTime: recipe.prepTime, lastMade: recipe.lastMade?.toISOString().slice(0, 10) ?? null,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) })));
  if (digest !== marker.recipeDigest) throw new Error("Une recette a été modifiée depuis l’import ; rollback arrêté sans l’écraser.");
}
