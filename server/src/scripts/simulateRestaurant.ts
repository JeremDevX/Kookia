import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import {
  assertSeedSnapshot, buildRecipePlan, digestRecipePlan, isLegacyImportMovement,
} from "./restaurantSimulationSupport.js";
import {
  buildRestaurantSimulation, SIMULATION_MARKER, SIMULATION_VERSION,
  type ExistingProductSnapshot,
} from "./restaurantSimulationPlan.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { readSourceInvoices } from "./sourceInvoices.js";
import { applyRestaurantSimulation } from "./restaurantSimulationStorage.js";
import { writePrivateSimulationBackup } from "./restaurantSimulationBackup.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";

const TARGET = "La Pizzeria de Camille" as const;
const write = process.argv.includes("--write");
const database = new URL(env.DATABASE_URL);
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!allowedHosts.has(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Simulation refusée : seule la base PostgreSQL locale kookia est autorisée.");
}

const round = (value: number) => Math.round(value * 1000) / 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const simulationProductIds = scenarioProducts.map((product) => product.id);
const seedProductIds = scenarioProducts.filter((product) => !product.id.startsWith("simulation-v1-")).map((product) => product.id);

async function otherWorkspaceFingerprint(restaurantIds: string[]) {
  const rows = await Promise.all(restaurantIds.map(async (restaurantId) => {
    const [products, movements, recipes, productions, sales, orders, decisions, documents] = await Promise.all([
      prisma.product.count({ where: { restaurantId } }), prisma.stockMovement.count({ where: { restaurantId } }),
      prisma.recipe.count({ where: { restaurantId } }), prisma.production.count({ where: { restaurantId } }),
      prisma.dailySale.count({ where: { restaurantId } }), prisma.purchaseOrder.count({ where: { restaurantId } }),
      prisma.recommendationDecision.count({ where: { restaurantId } }), prisma.workspaceDocument.count({ where: { restaurantId } }),
    ]);
    return { restaurantId, products, movements, recipes, productions, sales, orders, decisions, documents };
  }));
  return { count: restaurantIds.length, digest: hash(JSON.stringify(rows.sort((a, b) => a.restaurantId.localeCompare(b.restaurantId)))) };
}

async function assertArchive(restaurantId: string, invoices: ReturnType<typeof readSourceInvoices>) {
  const documents = await prisma.workspaceDocument.findMany({
    where: { restaurantId, kind: { startsWith: "source-invoice:" } }, select: { kind: true, data: true },
  });
  const byKind = new Map(documents.map((document) => [document.kind, document.data]));
  if (documents.length !== invoices.length) throw new Error("L’archive des pièces source doit contenir exactement 431 fiches avant la simulation.");
  for (const invoice of invoices) {
    const data = byKind.get(`source-invoice:${invoice.id}`);
    if (!data || typeof data !== "object" || Array.isArray(data) || (data as { contentHash?: unknown }).contentHash !== invoice.contentHash) {
      throw new Error(`Fiche source absente ou modifiée : ${invoice.file}. Lancez d’abord l’import documentaire en mode vérification.`);
    }
  }
}

function productSnapshot(rows: Array<{ id: string; unit: string; currentStock: Prisma.Decimal; minThreshold: Prisma.Decimal;
  pricePerUnit: Prisma.Decimal; supplierId: string; name: string; category: string }>): ExistingProductSnapshot[] {
  return rows.map((product) => ({ ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit) }));
}

async function assertNoopComplete(restaurantId: string, markerData: unknown, otherWorkspaceCount: number) {
  if (!markerData || typeof markerData !== "object" || Array.isArray(markerData)) throw new Error("Marqueur de simulation invalide.");
  const marker = markerData as { version?: string; sourceDigest?: string; counts?: Record<string, number>;
    yearCoverage?: unknown; productState?: Array<Record<string, unknown>>; recipeDigest?: string; saleItemIds?: string[];
    recipeVersionIds?: string[]; recipeRevisionById?: Record<string, number> };
  if (marker.version !== SIMULATION_VERSION || !marker.counts || !Array.isArray(marker.productState) ||
    !marker.saleItemIds || !marker.recipeVersionIds || !marker.recipeRevisionById) {
    throw new Error("Une simulation précédente incomplète existe ; aucune donnée ne sera remplacée.");
  }
  const [movementCount, productionRows, salesRows, saleItemCount, legacyProducts, allMovements, products, recipes] = await Promise.all([
    prisma.stockMovement.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    prisma.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { actorId: true, recipeVersionId: true } }),
    prisma.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { createdBy: true, updatedBy: true, revision: true } }),
    prisma.saleItem.count({ where: { restaurantId, id: { in: marker.saleItemIds } } }),
    prisma.product.count({ where: { restaurantId, id: { startsWith: "invoice-product-" } } }),
    prisma.stockMovement.findMany({ where: { restaurantId, reason: { in: ["invoice_import_demo", "simulated_consumption", "simulated_unit_rounding"] } },
      select: { reason: true, operationId: true } }),
    prisma.product.findMany({ where: { restaurantId, id: { in: simulationProductIds } } }),
    prisma.recipe.findMany({ where: { restaurantId }, include: { ingredients: { orderBy: { productId: "asc" } } }, orderBy: { id: "asc" } }),
  ]);
  const generatedVersions = await prisma.recipeVersion.findMany({ where: { restaurantId, id: { in: marker.recipeVersionIds } },
    select: { id: true, recipeId: true, version: true, actorId: true, operationId: true } });
  const legacyMovementCount = allMovements.filter(isLegacyImportMovement).length;
  if (movementCount !== marker.counts.stockMovements || productionRows.length !== marker.counts.productions ||
    salesRows.length !== marker.counts.sales || saleItemCount !== marker.saleItemIds.length || legacyProducts !== 0 || legacyMovementCount !== 0 ||
    productionRows.some((row) => row.actorId !== SIMULATION_MARKER || !marker.recipeVersionIds!.includes(row.recipeVersionId ?? "")) ||
    generatedVersions.length !== marker.recipeVersionIds.length || generatedVersions.some((version) =>
      version.actorId !== SIMULATION_MARKER || version.operationId !== `${SIMULATION_VERSION}:recipe:${version.recipeId}:v${version.version}` ||
      marker.recipeRevisionById?.[version.recipeId] !== version.version) ||
    salesRows.some((row) => row.createdBy !== SIMULATION_MARKER || row.updatedBy !== SIMULATION_MARKER || row.revision !== 0)) {
    throw new Error("La simulation existante ne correspond plus à son inventaire ; aucun remplacement automatique n’est sûr.");
  }
  const productById = new Map(products.map((product) => [product.id, product]));
  for (const state of marker.productState) {
    const spec = scenarioProducts.find((product) => product.id === state.id)!;
    const product = productById.get(String(state.id));
    if (!product || product.unit !== state.unit || Math.abs(Number(product.currentStock) - Number(state.closing)) > 0.0005 ||
      Math.abs(Number(product.minThreshold) - Number(state.minThreshold)) > 0.0005 ||
      Math.abs(Number(product.pricePerUnit) - Number(state.pricePerUnit)) > 0.00005 ||
      product.supplierId !== state.supplierId || product.name !== spec.name || product.category !== spec.category ||
      (product.lastDelivery?.toISOString().slice(0, 10) ?? null) !== (state.lastDelivery ?? null)) {
      throw new Error("Un produit a changé depuis la simulation ; aucune donnée humaine ne sera écrasée.");
    }
  }
  const currentRecipeDigest = digestRecipePlan(recipes.map((recipe) => ({ id: recipe.id, name: recipe.name,
    category: recipe.category, prepTime: recipe.prepTime, lastMade: recipe.lastMade?.toISOString().slice(0, 10) ?? null,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) })));
  if (currentRecipeDigest !== marker.recipeDigest || recipes.some((recipe) =>
    marker.recipeRevisionById?.[recipe.id] !== recipe.revision)) {
    throw new Error("Les recettes ont changé depuis la simulation ; aucune saisie ne sera écrasée.");
  }
  return { counts: marker.counts, yearCoverage: marker.yearCoverage, otherWorkspaceCount };
}

try {
  await prisma.$connect();
  const [{ name: databaseName }] = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`SELECT current_database() AS name`);
  if (databaseName !== "kookia") throw new Error("Simulation refusée : le nom de base active n’est pas kookia.");
  const { restaurantId } = await resolveCamilleRestaurantId();
  const invoices = readSourceInvoices();
  await assertArchive(restaurantId, invoices);
  const otherRestaurantIds = (await prisma.restaurant.findMany({ where: { id: { not: restaurantId } }, select: { id: true } }))
    .map((restaurant) => restaurant.id);
  const otherBefore = await otherWorkspaceFingerprint(otherRestaurantIds);

  const priorMarker = await prisma.workspaceDocument.findUnique({
    where: { restaurantId_kind: { restaurantId, kind: SIMULATION_MARKER } }, select: { data: true },
  });
  if (priorMarker) {
    const result = await assertNoopComplete(restaurantId, priorMarker.data, otherRestaurantIds.length);
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
  const existingSeedProducts = productSnapshot(seedRows);
  const normalizedRecipes = recipes.map((recipe) => ({ ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) }));
  assertSeedSnapshot(existingSeedProducts.map((product) => ({ ...product, lastDelivery: seedRows.find((row) => row.id === product.id)!.lastDelivery })), normalizedRecipes);
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

  const plannedExistingProducts = productSnapshot(seedRows);
  const plan = buildRestaurantSimulation(invoices, plannedExistingProducts);
  const recipePlan = buildRecipePlan(normalizedRecipes, plan.productions, plan.recipeVersions);
  const scenarioNames = plan.sales.filter((sale, index, all) => all.findIndex((candidate) => candidate.itemId === sale.itemId) === index)
    .map((sale) => sale.itemName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR"));
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
  const supplierNames = new Set(plan.receipts.map((receipt) => `invoice-supplier-${createHash("sha256")
    .update(receipt.supplier.toLocaleLowerCase("fr")).digest("hex").slice(0, 24)}`));
  for (const product of plan.productState) if (product.supplierId?.startsWith("simulation-v1-")) supplierNames.add(product.supplierId);
  const existingSupplierIds = new Set(supplierRows.map((supplier) => supplier.id));
  const createdSupplierIds = [...supplierNames].filter((id) => !existingSupplierIds.has(id));
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
    scenarioSaleItemIds: [...new Set(plan.sales.map((sale) => sale.itemId))], createdSupplierIds,
  };
  const backupPath = writePrivateSimulationBackup(backup);
  await applyRestaurantSimulation(restaurantId, plan, recipePlan, oldProductIds, legacyMovementIds, existingSupplierIds);
  await assertPersistedSimulation(restaurantId, plan);

  const afterIsolation = await otherWorkspaceFingerprint(otherRestaurantIds);
  if (afterIsolation.digest !== otherBefore.digest) throw new Error("L’empreinte d’un autre espace a changé pendant l’opération ; aucune écriture n’a été faite dans ces espaces par ce script.");
  console.info(JSON.stringify({ target: TARGET, mode: "written", backupPath, counts: plan.counts,
    yearCoverage: plan.yearCoverage, isolationVerified: afterIsolation.count === otherBefore.count && afterIsolation.digest === otherBefore.digest }, null, 2));
}

async function assertPersistedSimulation(restaurantId: string, plan: ReturnType<typeof buildRestaurantSimulation>) {
  const productIds = plan.productState.map((product) => product.id);
  const [products, movements, productionRows, saleRows, saleItemCount] = await Promise.all([
    prisma.product.findMany({ where: { restaurantId, id: { in: productIds } } }),
    prisma.stockMovement.findMany({ where: { restaurantId, productId: { in: productIds } }, select: {
      productId: true, delta: true, reason: true, operationId: true, createdAt: true,
    } }),
    prisma.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { operationId: true, portions: true, notes: true, date: true, actorId: true,
        recipeVersionId: true } }),
    prisma.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { operationId: true, quantity: true, serviceDate: true, createdBy: true, updatedBy: true, revision: true } }),
    prisma.saleItem.count({ where: { restaurantId, id: { in: [...new Set(plan.sales.map((sale) => sale.itemId))] } } }),
  ]);
  if (products.length !== productIds.length || movements.length !== plan.counts.stockMovements ||
    productionRows.length !== plan.productions.length || saleRows.length !== plan.sales.length ||
    saleItemCount !== new Set(plan.sales.map((sale) => sale.itemId)).size) {
    throw new Error("Le nombre de lignes enregistré ne correspond pas au dry-run.");
  }
  const balanceByProduct = new Map<string, number>();
  const unitByProduct = new Map(plan.productState.map((product) => [product.id, product.unit]));
  for (const movement of movements) {
    const delta = Number(movement.delta);
    if (unitByProduct.get(movement.productId) === "pcs" && !Number.isInteger(delta)) {
      throw new Error(`Mouvement persistant fractionnaire en pièces (${movement.productId}).`);
    }
    balanceByProduct.set(movement.productId, round((balanceByProduct.get(movement.productId) ?? 0) + delta));
    if (movement.createdAt.toISOString().slice(0, 10) > plan.endDate) throw new Error("Mouvement écrit dans le futur.");
  }
  for (const state of plan.productState) {
    const product = products.find((row) => row.id === state.id)!;
    if (Math.abs(Number(product.currentStock) - (balanceByProduct.get(product.id) ?? 0)) > 0.0005 ||
      Math.abs(Number(product.currentStock) - state.closing) > 0.0005) {
      throw new Error(`Stock persistant différent du journal pour ${product.id}.`);
    }
  }
  const productionsByOperation = new Map(productionRows.map((production) => [production.operationId, production]));
  const salesByOperation = new Map(saleRows.map((sale) => [sale.operationId, sale]));
  for (const sale of plan.sales) {
    const production = productionsByOperation.get(sale.productionOperationId);
    const persistedSale = salesByOperation.get(sale.operationId);
    if (!production || !persistedSale || production.actorId !== SIMULATION_MARKER || !production.recipeVersionId ||
      persistedSale.createdBy !== SIMULATION_MARKER || persistedSale.updatedBy !== SIMULATION_MARKER || persistedSale.revision !== 0 ||
      sale.operationId !== `${sale.productionOperationId}:sale` ||
      production.portions !== sale.portionsPrepared || production.portions !== sale.quantity + sale.estimatedUnsold ||
      !production.notes.includes(sale.operationId) || persistedSale.quantity !== sale.quantity ||
      persistedSale.serviceDate.toISOString().slice(0, 10) !== sale.date) {
      throw new Error(`Lien ventes/productions invalide (${sale.operationId}).`);
    }
  }
}
