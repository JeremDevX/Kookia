import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { digestRecipePlan, type PlannedRecipe } from "./restaurantSimulationSupport.js";
import { SIMULATION_MARKER, SIMULATION_VERSION } from "./restaurantSimulationPlan.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";
import { parseSimulationBackup } from "./restaurantSimulationBackup.js";

const backupArgument = process.argv.indexOf("--backup");
const backupPath = backupArgument >= 0 ? process.argv[backupArgument + 1] : undefined;
const database = new URL(env.DATABASE_URL);
if (!backupPath || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Rollback refusé : fournissez --backup et utilisez uniquement la base locale kookia.");
}
const backup = parseSimulationBackup(readFileSync(backupPath, "utf8"));
const { products: savedProducts, stockMovements: savedMovements,
  recipes: savedRecipes, recipeIngredients: savedIngredients } = backup;
const simulationProductIds = scenarioProducts.map((product) => product.id);
const syntheticProductIds = scenarioProducts.filter((product) => product.id.startsWith("simulation-v1-product-")).map((product) => product.id);
const savedRecipeIds = savedRecipes.map((recipe) => recipe.id);
const markerSchema = z.object({
  version: z.literal(SIMULATION_VERSION), sourceDigest: z.string(), recipeDigest: z.string(),
  counts: z.object({ stockMovements: z.int().nonnegative(), productions: z.int().nonnegative(), sales: z.int().nonnegative() }),
  productState: z.array(z.object({
    id: z.string(), unit: z.string(), supplierId: z.string(), lastDelivery: z.iso.date().optional(),
    closing: z.number(), minThreshold: z.number(), pricePerUnit: z.number(),
  })),
  saleItemIds: z.array(z.string()), recipeVersionIds: z.array(z.string()),
  recipeRevisionById: z.record(z.string(), z.int().positive()), createdSupplierIds: z.array(z.string()).default([]),
});
type ActiveMarker = z.infer<typeof markerSchema>;
const batch = async <T>(items: T[], insert: (items: T[]) => Promise<unknown>) => {
  for (let index = 0; index < items.length; index += 500) await insert(items.slice(index, index + 500));
};

try {
  await prisma.$connect();
  const [{ name: databaseName }] = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`SELECT current_database() AS name`);
  if (databaseName !== "kookia") throw new Error("Rollback refusé : la base active n’est pas kookia.");
  const { restaurantId } = await resolveCamilleRestaurantId();
  if (restaurantId !== backup.restaurantId) throw new Error("La sauvegarde appartient à un autre espace ; aucune écriture effectuée.");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR NO KEY UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId}
      AND id IN (${Prisma.join(simulationProductIds)}) ORDER BY id FOR UPDATE`);
    const markerRow = await tx.workspaceDocument.findUnique({
      where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } }, select: { data: true },
    });
    const parsedMarker = markerSchema.safeParse(markerRow?.data);
    if (!parsedMarker.success) throw new Error("Le marqueur de simulation est absent ou incomplet ; aucune écriture effectuée.");
    const marker = parsedMarker.data;
    const markedProducts = new Set(marker.productState.map((product) => product.id));
    const markedItems = new Set(marker.saleItemIds);
    if (marker.sourceDigest !== backup.sourceDigest || marker.productState.length !== simulationProductIds.length ||
      !simulationProductIds.every((id) => markedProducts.has(id)) || marker.saleItemIds.length !== backup.scenarioSaleItemIds.length ||
      !backup.scenarioSaleItemIds.every((id) => markedItems.has(id)) ||
      backup.createdSupplierIds.some((id) => !marker.createdSupplierIds.includes(id))) {
      throw new Error("La simulation active ne correspond pas à cette sauvegarde ; aucune écriture effectuée.");
    }
    await assertNoHumanChanges(tx, restaurantId, marker);

    const generatedServiceDates = await tx.dailySale.findMany({
      where: { restaurantId, source: "demo_simulation", operationId: { startsWith: SIMULATION_VERSION + ":" } },
      select: { serviceDate: true }, distinct: ["serviceDate"],
    });
    const generatedContributions = await tx.saleContribution.findMany({ where: { restaurantId,
      source: "demo_simulation", sourceKey: { startsWith: `${SIMULATION_VERSION}:` } }, select: { id: true } });
    await tx.dailySale.deleteMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.saleContribution.deleteMany({ where: { restaurantId, id: { in: generatedContributions.map((row) => row.id) } } });
    await tx.production.deleteMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.recipeVersion.deleteMany({ where: { restaurantId, id: { in: marker.recipeVersionIds } } });
    await tx.stockMovement.deleteMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } });
    await tx.workspaceDocument.delete({ where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } } });
    await tx.serviceDay.deleteMany({ where: {
      restaurantId, serviceDate: { in: generatedServiceDates.map((row) => row.serviceDate) },
      actorId: SIMULATION_MARKER, revision: 0, status: "open", coverage: "complete", sales: { none: {} },
    } });

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
        yieldPortions: recipe.yieldPortions, revision: recipe.revision,
        lastMade: recipe.lastMade ? new Date(recipe.lastMade) : null },
    });
    await batch(savedIngredients, (rows) => tx.recipeIngredient.createMany({ data: rows }));

    for (const product of savedProducts) {
      const data = { name: product.name, category: product.category,
        currentStock: product.currentStock, unit: product.unit,
        minThreshold: product.minThreshold, supplierId: product.supplierId,
        pricePerUnit: product.pricePerUnit,
        lastDelivery: product.lastDelivery ? new Date(product.lastDelivery) : null };
      await tx.product.upsert({ where: { restaurantId_id: { restaurantId, id: product.id } },
        create: { restaurantId, id: product.id, ...data }, update: { ...data, stockRevision: { increment: 1 } } });
    }
    await batch(savedMovements, (rows) => tx.stockMovement.createMany({ data: rows.map((row) => ({
      ...row, createdAt: new Date(row.createdAt),
    })) }));

    for (const supplierId of backup.createdSupplierIds) {
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

async function assertNoHumanChanges(tx: Prisma.TransactionClient, restaurantId: string, marker: ActiveMarker) {
  const [movementCount, productionCount, saleCount, contributionCount, unrelatedMovements, unrelatedProductions, currentProducts, currentRecipes] = await Promise.all([
    tx.stockMovement.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    tx.production.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    tx.dailySale.count({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    tx.saleContribution.count({ where: { restaurantId, source: "demo_simulation", sourceKey: { startsWith: `${SIMULATION_VERSION}:` } } }),
    tx.stockMovement.count({ where: { restaurantId, productId: { in: simulationProductIds }, NOT: { operationId: { startsWith: `${SIMULATION_VERSION}:` } } } }),
    tx.production.count({ where: { restaurantId, recipeId: { in: savedRecipeIds }, NOT: { operationId: { startsWith: `${SIMULATION_VERSION}:` } } } }),
    tx.product.findMany({ where: { restaurantId, id: { in: simulationProductIds } } }),
    tx.recipe.findMany({ where: { restaurantId }, include: { ingredients: { orderBy: { productId: "asc" } } }, orderBy: { id: "asc" } }),
  ]);
  if (movementCount !== marker.counts.stockMovements || productionCount !== marker.counts.productions ||
    saleCount !== marker.counts.sales || contributionCount !== marker.counts.sales || unrelatedMovements || unrelatedProductions) {
    throw new Error("Des mouvements manuels ou un scénario incomplet existent ; rollback arrêté pour préserver les saisies.");
  }
  const [generatedSales, generatedContributions, generatedProductions, generatedVersions] = await Promise.all([
    tx.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { createdBy: true, updatedBy: true, revision: true } }),
    tx.saleContribution.findMany({ where: { restaurantId, source: "demo_simulation", sourceKey: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { id: true, reviewedBy: true, reviewRevision: true, status: true, source: true } }),
    tx.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { actorId: true, recipeVersionId: true } }),
    tx.recipeVersion.findMany({ where: { restaurantId, id: { in: marker.recipeVersionIds } },
      select: { id: true, recipeId: true, version: true, actorId: true, operationId: true } }),
  ]);
  if (generatedSales.some((sale) => sale.createdBy !== SIMULATION_MARKER || sale.updatedBy !== SIMULATION_MARKER || sale.revision !== 0) ||
    generatedContributions.some((contribution) => contribution.reviewedBy !== SIMULATION_MARKER || contribution.reviewRevision !== 1 ||
      contribution.status !== "accepted" || contribution.source !== "demo_simulation") ||
    await tx.saleContributionEvent.count({ where: { restaurantId,
      contributionId: { in: generatedContributions.map((row) => row.id) } } }) !== marker.counts.sales ||
    generatedProductions.some((production) => production.actorId !== SIMULATION_MARKER ||
      !marker.recipeVersionIds.includes(production.recipeVersionId ?? "")) ||
    generatedVersions.length !== marker.recipeVersionIds.length || generatedVersions.some((version) =>
      version.actorId !== SIMULATION_MARKER || version.operationId !== `${SIMULATION_VERSION}:recipe:${version.recipeId}:v${version.version}` ||
      marker.recipeRevisionById[version.recipeId] !== version.version)) {
    throw new Error("Une vente ou production simulée a été modifiée dans l’application ; rollback arrêté pour préserver la saisie.");
  }
  const currentById = new Map(currentProducts.map((product) => [product.id, product]));
  for (const state of marker.productState) {
    const spec = scenarioProducts.find((product) => product.id === state.id)!;
    const product = currentById.get(state.id);
    const lastDelivery = product?.lastDelivery?.toISOString().slice(0, 10) ?? null;
    if (!product || product.name !== spec.name || product.category !== spec.category || product.unit !== state.unit ||
      Math.abs(Number(product.currentStock) - state.closing) > 0.0005 ||
      Math.abs(Number(product.minThreshold) - state.minThreshold) > 0.0005 ||
      Math.abs(Number(product.pricePerUnit) - state.pricePerUnit) > 0.00005 ||
      product.supplierId !== state.supplierId || lastDelivery !== (state.lastDelivery ?? null)) {
      throw new Error("Un produit a été modifié depuis l’import ; rollback arrêté sans écraser cette saisie.");
    }
  }
  const digest = digestRecipePlan(currentRecipes.map((recipe): PlannedRecipe => ({ id: recipe.id, name: recipe.name,
    category: recipe.category, prepTime: recipe.prepTime, lastMade: recipe.lastMade?.toISOString().slice(0, 10) ?? null,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) })));
  if (digest !== marker.recipeDigest || currentRecipes.some((recipe) => marker.recipeRevisionById[recipe.id] !== recipe.revision))
    throw new Error("Une recette a été modifiée depuis l’import ; rollback arrêté sans l’écraser.");
}
