import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import {
  assertSeedSnapshot, buildRecipePlan, digestRecipePlan, isLegacyImportMovement, simulationSaleItems,
} from "./restaurantSimulationSupport.js";
import {
  buildRestaurantSimulation, SIMULATION_MARKER,
} from "./restaurantSimulationPlan.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { readSourceInvoices } from "./sourceInvoices.js";
import { applyRestaurantSimulation, simulationSuppliers } from "./restaurantSimulationStorage.js";
import { writePrivateSimulationBackup } from "./restaurantSimulationBackup.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";
import {
  assertArchive, assertNoopComplete, assertPersistedSimulation, otherWorkspaceFingerprint,
} from "./restaurantSimulationVerification.js";

const TARGET = "La Pizzeria de Camille" as const;
const write = process.argv.includes("--write");
const database = new URL(env.DATABASE_URL);
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!allowedHosts.has(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Simulation refusée : seule la base PostgreSQL locale kookia est autorisée.");
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const seedProductIds = scenarioProducts.filter((product) => !product.id.startsWith("simulation-v1-")).map((product) => product.id);

try {
  await prisma.$connect();
  const [{ name: databaseName }] = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`SELECT current_database() AS name`);
  if (databaseName !== "kookia") throw new Error("Simulation refusée : le nom de base active n’est pas kookia.");
  const { restaurantId } = await resolveCamilleRestaurantId();
  const invoices = readSourceInvoices();
  await assertArchive(prisma, restaurantId, invoices);
  const otherRestaurantIds = (await prisma.restaurant.findMany({ where: { id: { not: restaurantId } }, select: { id: true } }))
    .map((restaurant) => restaurant.id);
  const otherBefore = await otherWorkspaceFingerprint(prisma, otherRestaurantIds);

  const priorMarker = await prisma.workspaceDocument.findUnique({
    where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } }, select: { data: true },
  });
  if (priorMarker) {
    const result = await assertNoopComplete(prisma, restaurantId, priorMarker.data, otherRestaurantIds.length);
    console.info(JSON.stringify({ target: TARGET, mode: "already-applied", ...result, isolationVerified: true }, null, 2));
    process.exitCode = 0;
  } else {
    await runFirstSimulation(restaurantId, invoices, otherRestaurantIds, otherBefore);
  }
} finally {
  await prisma.$disconnect();
}

async function runFirstSimulation(restaurantId: string, invoices: ReturnType<typeof readSourceInvoices>,
  otherRestaurantIds: string[], otherBefore: { count: number; digest: string }) {
  const [seedRows, recipes, legacyProducts, supplierRows, allMovements, productionCount, saleCount, orders, decisions] = await Promise.all([
    prisma.product.findMany({ where: { restaurantId, id: { in: seedProductIds } }, orderBy: { id: "asc" } }),
    prisma.recipe.findMany({ where: { restaurantId }, include: { ingredients: { orderBy: { productId: "asc" } } }, orderBy: { id: "asc" } }),
    prisma.product.findMany({ where: { restaurantId, id: { startsWith: "invoice-product-" } }, orderBy: { id: "asc" } }),
    prisma.supplier.findMany({ where: { restaurantId }, select: { id: true } }),
    prisma.stockMovement.findMany({ where: { restaurantId }, select: {
      id: true, restaurantId: true, productId: true, reason: true, operationId: true, delta: true, actorId: true, createdAt: true,
    } }),
    prisma.production.count({ where: { restaurantId } }), prisma.dailySale.count({ where: { restaurantId } }),
    prisma.purchaseOrder.count({ where: { restaurantId } }), prisma.recommendationDecision.count({ where: { restaurantId } }),
  ]);
  const existingSeedProducts = seedRows.map((product) => ({
    ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit),
  }));
  const normalizedRecipes = recipes.map((recipe) => ({ ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) }));
  assertSeedSnapshot(existingSeedProducts, normalizedRecipes);
  if (productionCount || saleCount) throw new Error("Des ventes ou productions existent déjà ; elles sont préservées et la simulation est arrêtée.");

  const legacyProductIds = legacyProducts.map((product) => product.id);
  const legacyProductSet = new Set(legacyProductIds);
  const legacyMovements = allMovements.filter(isLegacyImportMovement);
  const scenarioProductSet = new Set(seedProductIds);
  const malformedLegacy = allMovements.filter((movement) =>
    ["invoice_import_demo", "simulated_consumption", "simulated_unit_rounding"].includes(movement.reason) && !isLegacyImportMovement(movement));
  if (malformedLegacy.length || legacyMovements.some((movement) => !legacyProductSet.has(movement.productId))) {
    throw new Error("Une provenance d’import historique est inattendue ; aucune ligne ne sera supprimée.");
  }
  const unrecognizedAffected = allMovements.filter((movement) =>
    (legacyProductSet.has(movement.productId) || scenarioProductSet.has(movement.productId)) && !isLegacyImportMovement(movement));
  if (unrecognizedAffected.length) throw new Error("Des mouvements hors import touchent au périmètre ; ils sont préservés et la simulation est arrêtée.");

  const legacyDeltas = new Map<string, number>();
  for (const movement of legacyMovements) legacyDeltas.set(movement.productId,
    round((legacyDeltas.get(movement.productId) ?? 0) + Number(movement.delta)));
  for (const product of legacyProducts) if (Math.abs(Number(product.currentStock) - (legacyDeltas.get(product.id) ?? 0)) > 0.001) {
    throw new Error(`Stock historique incohérent pour un produit importé (${product.id}).`);
  }
  const [ingredientRefs, predictionRefs, orderRefs] = legacyProductIds.length ? await Promise.all([
    prisma.recipeIngredient.count({ where: { restaurantId, productId: { in: legacyProductIds } } }),
    prisma.prediction.count({ where: { restaurantId, productId: { in: legacyProductIds } } }),
    prisma.purchaseOrderLine.count({ where: { productId: { in: legacyProductIds }, order: { restaurantId } } }),
  ]) : [0, 0, 0];
  if (ingredientRefs || predictionRefs || orderRefs) throw new Error("Un produit importé est référencé par une saisie conservée ; aucune suppression n’est sûre.");

  const plan = buildRestaurantSimulation(invoices, existingSeedProducts);
  const recipePlan = buildRecipePlan(normalizedRecipes, plan.productions, plan.recipeVersions);
  const saleItems = simulationSaleItems(plan.sales);
  const scenarioNames = saleItems.map(({ normalizedName }) => normalizedName);
  const existingSimulationItems = await prisma.saleItem.count({ where: { restaurantId, normalizedName: { in: scenarioNames } } });
  if (existingSimulationItems) throw new Error("Un article vendu de simulation existe déjà sans son marqueur ; il sera préservé.");
  const reservedProducts = await prisma.product.count({ where: { restaurantId, id: { startsWith: "simulation-v1-product-" } } });
  if (reservedProducts) throw new Error("Un produit réservé de scénario existe déjà sans son marqueur ; il sera préservé.");

  const movementByReason = Object.fromEntries([...new Set(legacyMovements.map((movement) => movement.reason))].sort()
    .map((reason) => [reason, legacyMovements.filter((movement) => movement.reason === reason).length]));
  const inventory = {
    sourceDocuments: invoices.length, seedProducts: seedRows.length, seedRecipes: recipes.length,
    legacyProducts: legacyProducts.length, legacyMovements: movementByReason,
    existingProductions: productionCount, existingSales: saleCount, purchaseOrdersPreserved: orders,
    recommendationDecisionsPreserved: decisions, otherWorkspaces: otherRestaurantIds.length,
  };
  const preview = { target: TARGET, mode: write ? "write-preview" : "dry-run", inventory,
    counts: plan.counts, yearCoverage: plan.yearCoverage, unitCosts: plan.unitCosts,
    finalStock: plan.productState.map(({ id, name, unit, opening, closing, pricePerUnit, priceBasis, minThreshold }) =>
      ({ id, name, unit, opening, closing, pricePerUnit, priceBasis, minThreshold })),
    recipeDigest: digestRecipePlan(recipePlan) };
  console.info(JSON.stringify(preview, null, 2));
  if (!write) return;

  const oldProductIds = legacyProductIds;
  const legacyMovementIds = legacyMovements.map((movement) => movement.id);
  const suppliers = simulationSuppliers(plan);
  const existingSupplierIds = new Set(supplierRows.map((supplier) => supplier.id));
  const createdSupplierIds = [...suppliers.keys()].filter((id) => !existingSupplierIds.has(id));
  const affectedIds = [...new Set([...oldProductIds, ...seedProductIds])];
  const backup = {
    formatVersion: 1 as const, targetRestaurant: TARGET, restaurantId, sourceDigest: plan.sourceDigest,
    capturedAt: new Date().toISOString(),
    products: await prisma.product.findMany({ where: { restaurantId, id: { in: affectedIds } } }),
    suppliers: supplierRows.map(({ id }) => ({ id })),
    stockMovements: legacyMovements,
    recipes: recipes.map((recipe) => ({ id: recipe.id, restaurantId: recipe.restaurantId, name: recipe.name,
      category: recipe.category, prepTime: recipe.prepTime, yieldPortions: recipe.yieldPortions,
      revision: recipe.revision, lastMade: recipe.lastMade })),
    recipeIngredients: recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ({
      restaurantId, recipeId: recipe.id, productId: ingredient.productId, quantity: ingredient.quantity,
    }))),
    productions: [], saleItems: [], dailySales: [],
    scenarioSaleItemIds: saleItems.map(({ id }) => id), createdSupplierIds,
  };
  const backupPath = writePrivateSimulationBackup(backup);
  await applyRestaurantSimulation(restaurantId, plan, recipePlan, oldProductIds, legacyMovementIds, existingSupplierIds);
  await assertPersistedSimulation(prisma, restaurantId, plan);

  const afterIsolation = await otherWorkspaceFingerprint(prisma, otherRestaurantIds);
  if (afterIsolation.digest !== otherBefore.digest) throw new Error("L’empreinte d’un autre espace a changé pendant l’opération ; aucune écriture n’a été faite dans ces espaces par ce script.");
  console.info(JSON.stringify({ target: TARGET, mode: "written", backupPath, counts: plan.counts,
    yearCoverage: plan.yearCoverage, isolationVerified: afterIsolation.count === otherBefore.count && afterIsolation.digest === otherBefore.digest }, null, 2));
}
