import { createHash } from "node:crypto";
import type { DailySale, Prisma, Product, Production, Recipe, RecipeIngredient, RecipeVersion } from "@prisma/client";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { SIMULATION_MARKER, SIMULATION_VERSION } from "./restaurantSimulationIdentity.js";
import type { buildRestaurantSimulation } from "./restaurantSimulationPlan.js";
import { digestRecipePlan, isLegacyImportMovement, simulationSaleItems } from "./restaurantSimulationSupport.js";
import type { SourceInvoice } from "./sourceInvoices.js";

const round = (value: number) => Math.round(value * 1000) / 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const scenarioProductById = new Map(scenarioProducts.map((product) => [product.id, product]));

type ProductSnapshot = Pick<Product, "id" | "name" | "category" | "unit" | "currentStock" | "minThreshold" |
  "pricePerUnit" | "supplierId" | "lastDelivery">;
type RecipeSnapshot = Pick<Recipe, "id" | "name" | "category" | "prepTime" | "lastMade" | "revision"> & {
  ingredients: Pick<RecipeIngredient, "productId" | "quantity">[];
};

export function hasChangedSimulationProducts(products: ProductSnapshot[], states: Record<string, unknown>[]) {
  const productById = new Map(products.map((product) => [product.id, product]));
  return states.some((state) => {
    const { id } = state;
    if (typeof id !== "string") return true;
    const spec = scenarioProductById.get(id);
    const product = productById.get(id);
    if (!spec || !product) return true;
    return product.unit !== state.unit || Math.abs(Number(product.currentStock) - Number(state.closing)) > 0.0005 ||
      Math.abs(Number(product.minThreshold) - Number(state.minThreshold)) > 0.0005 ||
      Math.abs(Number(product.pricePerUnit) - Number(state.pricePerUnit)) > 0.00005 ||
      product.supplierId !== state.supplierId || product.name !== spec.name || product.category !== spec.category ||
      (product.lastDelivery?.toISOString().slice(0, 10) ?? null) !== (state.lastDelivery ?? null);
  });
}

export function matchesSimulationRecipes(
  recipes: RecipeSnapshot[], recipeDigest: string | undefined, recipeRevisionById: Record<string, number>,
) {
  const digest = digestRecipePlan(recipes.map((recipe) => ({ id: recipe.id, name: recipe.name,
    category: recipe.category, prepTime: recipe.prepTime, lastMade: recipe.lastMade?.toISOString().slice(0, 10) ?? null,
    ingredients: recipe.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: Number(ingredient.quantity) })) })));
  return digest === recipeDigest && recipes.every((recipe) => recipeRevisionById[recipe.id] === recipe.revision);
}

export function matchesSimulationRecipeVersions(
  versions: Pick<RecipeVersion, "actorId" | "operationId" | "recipeId" | "version">[],
  expectedCount: number, recipeRevisionById: Record<string, number>,
) {
  return versions.length === expectedCount && versions.every((version) =>
    version.actorId === SIMULATION_MARKER &&
    version.operationId === `${SIMULATION_VERSION}:recipe:${version.recipeId}:v${version.version}` &&
    recipeRevisionById[version.recipeId] === version.version);
}

export function isSimulationProduction(
  production: Pick<Production, "actorId" | "recipeVersionId">, recipeVersionIds: string[],
) {
  return production.actorId === SIMULATION_MARKER && recipeVersionIds.includes(production.recipeVersionId ?? "");
}

export function isUnchangedSimulationSale(sale: Pick<DailySale, "createdBy" | "updatedBy" | "revision">) {
  return sale.createdBy === SIMULATION_MARKER && sale.updatedBy === SIMULATION_MARKER && sale.revision === 0;
}

export async function otherWorkspaceFingerprint(db: Prisma.TransactionClient, restaurantIds: string[]) {
  const rows = await Promise.all(restaurantIds.map(async (restaurantId) => {
    const [products, movements, recipes, productions, sales, orders, decisions, documents] = await Promise.all([
      db.product.count({ where: { restaurantId } }), db.stockMovement.count({ where: { restaurantId } }),
      db.recipe.count({ where: { restaurantId } }), db.production.count({ where: { restaurantId } }),
      db.dailySale.count({ where: { restaurantId } }), db.purchaseOrder.count({ where: { restaurantId } }),
      db.recommendationDecision.count({ where: { restaurantId } }), db.workspaceDocument.count({ where: { restaurantId } }),
    ]);
    return { restaurantId, products, movements, recipes, productions, sales, orders, decisions, documents };
  }));
  return { count: restaurantIds.length, digest: hash(JSON.stringify(rows.sort((a, b) => a.restaurantId.localeCompare(b.restaurantId)))) };
}

export async function assertArchive(db: Prisma.TransactionClient, restaurantId: string, invoices: SourceInvoice[]) {
  const documents = await db.workspaceDocument.findMany({
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

export async function assertNoopComplete(db: Prisma.TransactionClient, restaurantId: string, markerData: unknown, otherWorkspaceCount: number) {
  if (!markerData || typeof markerData !== "object" || Array.isArray(markerData)) throw new Error("Marqueur de simulation invalide.");
  const { version, counts, yearCoverage, productState, recipeDigest, saleItemIds,
    recipeVersionIds, recipeRevisionById } = markerData as { version?: string; counts?: Record<string, number>;
    yearCoverage?: unknown; productState?: Array<Record<string, unknown>>; recipeDigest?: string; saleItemIds?: string[];
    recipeVersionIds?: string[]; recipeRevisionById?: Record<string, number> };
  if (version !== SIMULATION_VERSION || !counts || !Array.isArray(productState) ||
    !saleItemIds || !recipeVersionIds || !recipeRevisionById) {
    throw new Error("Une simulation précédente incomplète existe ; aucune donnée ne sera remplacée.");
  }
  const [movementCount, productionRows, salesRows, saleItemCount, legacyProducts, allMovements, products, recipes] = await Promise.all([
    db.stockMovement.count({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } } }),
    db.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { actorId: true, recipeVersionId: true } }),
    db.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { createdBy: true, updatedBy: true, revision: true } }),
    db.saleItem.count({ where: { restaurantId, id: { in: saleItemIds } } }),
    db.product.count({ where: { restaurantId, id: { startsWith: "invoice-product-" } } }),
    db.stockMovement.findMany({ where: { restaurantId, reason: { in: ["invoice_import_demo", "simulated_consumption", "simulated_unit_rounding"] } },
      select: { reason: true, operationId: true } }),
    db.product.findMany({ where: { restaurantId, id: { in: [...scenarioProductById.keys()] } } }),
    db.recipe.findMany({ where: { restaurantId }, include: { ingredients: { orderBy: { productId: "asc" } } }, orderBy: { id: "asc" } }),
  ]);
  const generatedVersions = await db.recipeVersion.findMany({ where: { restaurantId, id: { in: recipeVersionIds } },
    select: { recipeId: true, version: true, actorId: true, operationId: true } });
  if (movementCount !== counts.stockMovements || productionRows.length !== counts.productions ||
    salesRows.length !== counts.sales || saleItemCount !== saleItemIds.length || legacyProducts !== 0 || allMovements.some(isLegacyImportMovement) ||
    !productionRows.every((row) => isSimulationProduction(row, recipeVersionIds)) ||
    !matchesSimulationRecipeVersions(generatedVersions, recipeVersionIds.length, recipeRevisionById) ||
    !salesRows.every(isUnchangedSimulationSale)) {
    throw new Error("La simulation existante ne correspond plus à son inventaire ; aucun remplacement automatique n’est sûr.");
  }
  if (hasChangedSimulationProducts(products, productState)) {
    throw new Error("Un produit a changé depuis la simulation ; aucune donnée humaine ne sera écrasée.");
  }
  if (!matchesSimulationRecipes(recipes, recipeDigest, recipeRevisionById)) {
    throw new Error("Les recettes ont changé depuis la simulation ; aucune saisie ne sera écrasée.");
  }
  return { counts, yearCoverage, otherWorkspaceCount };
}

export async function assertPersistedSimulation(db: Prisma.TransactionClient, restaurantId: string, plan: ReturnType<typeof buildRestaurantSimulation>) {
  const productIds = plan.productState.map((product) => product.id);
  const saleItemIds = simulationSaleItems(plan.sales).map(({ id }) => id);
  const [products, movements, productionRows, saleRows, saleItemCount] = await Promise.all([
    db.product.findMany({ where: { restaurantId, id: { in: productIds } } }),
    db.stockMovement.findMany({ where: { restaurantId, productId: { in: productIds } }, select: {
      productId: true, delta: true, createdAt: true,
    } }),
    db.production.findMany({ where: { restaurantId, operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { operationId: true, portions: true, notes: true, actorId: true,
        recipeVersionId: true } }),
    db.dailySale.findMany({ where: { restaurantId, source: "demo_simulation", operationId: { startsWith: `${SIMULATION_VERSION}:` } },
      select: { operationId: true, quantity: true, serviceDate: true, createdBy: true, updatedBy: true, revision: true } }),
    db.saleItem.count({ where: { restaurantId, id: { in: saleItemIds } } }),
  ]);
  if (products.length !== productIds.length || movements.length !== plan.counts.stockMovements ||
    productionRows.length !== plan.productions.length || saleRows.length !== plan.sales.length ||
    saleItemCount !== saleItemIds.length) {
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
      !isUnchangedSimulationSale(persistedSale) ||
      sale.operationId !== `${sale.productionOperationId}:sale` ||
      production.portions !== sale.portionsPrepared || production.portions !== sale.quantity + sale.estimatedUnsold ||
      !production.notes.includes(sale.operationId) || persistedSale.quantity !== sale.quantity ||
      persistedSale.serviceDate.toISOString().slice(0, 10) !== sale.date) {
      throw new Error(`Lien ventes/productions invalide (${sale.operationId}).`);
    }
  }
}
