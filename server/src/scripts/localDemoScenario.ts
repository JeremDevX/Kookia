import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { createRecipeCandidate } from "../application/workspace/recipeCandidateService.js";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import type { SourceInvoice } from "./sourceInvoices.js";
import type { DemoRecipeIdeaSeed } from "./demoRecipeIdeas.js";
import { applyRestaurantSimulation } from "./restaurantSimulationStorage.js";
import { assertSeedSnapshot, buildRecipePlan } from "./restaurantSimulationSupport.js";
import { buildRestaurantSimulation } from "./restaurantSimulationPlan.js";

function sourceDocument(invoice: SourceInvoice): Prisma.InputJsonObject {
  const stockLines: Prisma.InputJsonValue[] = invoice.stockLines.map((line) => ({
    name: line.name, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice,
    sourceQuantityText: line.sourceQuantityText, sourceLineNumber: line.sourceLineNumber,
    priceBasis: line.priceBasis, priceTaxBasis: line.priceTaxBasis,
    ...(line.code ? { code: line.code } : {}),
  }));
  return {
    id: invoice.id, contentHash: invoice.contentHash, title: invoice.title, date: invoice.date ?? null,
    originalDate: invoice.originalDate ?? null, supplier: invoice.supplier, type: invoice.type,
    status: invoice.status, content: invoice.content, stockLines,
  };
}

async function assertFreshWorkspace(restaurantId: string) {
  const [restaurant, products, recipes, stockMovements, productions, sales, serviceDays, stockCounts,
    purchaseOrders, decisions, sourceDocuments, marker] = await Promise.all([
    prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } }),
    prisma.product.findMany({ where: { restaurantId } }),
    prisma.recipe.findMany({ where: { restaurantId }, include: { ingredients: true } }),
    prisma.stockMovement.count({ where: { restaurantId } }),
    prisma.production.count({ where: { restaurantId } }),
    prisma.dailySale.count({ where: { restaurantId } }),
    prisma.serviceDay.count({ where: { restaurantId } }),
    prisma.stockCount.count({ where: { restaurantId } }),
    prisma.purchaseOrder.count({ where: { restaurantId } }),
    prisma.recommendationDecision.count({ where: { restaurantId } }),
    prisma.workspaceDocument.count({ where: { restaurantId, kind: { startsWith: "source-invoice:" } } }),
    prisma.workspaceDocument.count({ where: { restaurantId, kind: "restaurant-simulation:v1" } }),
  ]);
  if (restaurant.mode !== "operational" || stockMovements || productions || sales || serviceDays || stockCounts ||
      purchaseOrders || decisions || sourceDocuments || marker) {
    throw new Error("Le bac démo local exige un espace neuf sans opération existante.");
  }

  const productSnapshots = products.map((product) => ({ ...product, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit) }));
  const recipeSnapshots = recipes.map((recipe) => ({ ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient, quantity: Number(ingredient.quantity) })) }));
  assertSeedSnapshot(productSnapshots, recipeSnapshots);
  return { productSnapshots, recipeSnapshots };
}

export async function seedLocalDemoScenario(ownerId: string, sources: { invoices: SourceInvoice[]; recipeIdeas: DemoRecipeIdeaSeed }) {
  const restaurant = await ensureWorkspace(ownerId);
  const { productSnapshots, recipeSnapshots } = await assertFreshWorkspace(restaurant.id);
  const { invoices, recipeIdeas } = sources;
  const recipeIdeaSources = recipeIdeas.sources;
  const plan = buildRestaurantSimulation(invoices, productSnapshots.map((product) => ({
    id: product.id, name: product.name, unit: product.unit, currentStock: product.currentStock,
    minThreshold: product.minThreshold, pricePerUnit: product.pricePerUnit,
    supplierId: product.supplierId, category: product.category,
  })), true);
  const plannedRecipes = buildRecipePlan(recipeSnapshots, plan.productions, plan.recipeVersions);
  const suppliers = await prisma.supplier.findMany({ where: { restaurantId: restaurant.id }, select: { id: true } });

  const sourceInvoicesById = new Map<string, SourceInvoice>();
  for (const invoice of [...invoices, ...recipeIdeaSources]) {
    const existing = sourceInvoicesById.get(invoice.id);
    if (existing && existing.contentHash !== invoice.contentHash)
      throw new Error("Une référence de pièce source est ambiguë dans le bac de démonstration.");
    sourceInvoicesById.set(invoice.id, invoice);
  }
  await prisma.workspaceDocument.createMany({ data: [...sourceInvoicesById.values()].map((invoice) => ({
    restaurantId: restaurant.id, kind: `source-invoice:${invoice.id}`, data: sourceDocument(invoice),
  })) });
  await applyRestaurantSimulation(restaurant.id, plan, plannedRecipes, [], [], new Set(suppliers.map(({ id }) => id)));
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: {
    mode: "demo", name: "Restaurant de démonstration KookIA", type: "Restaurant de démonstration",
    address: "", city: "", phone: "", email: "demo@kookia.local", dailyCovers: 50,
  } });
  const effectiveFrom = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
    month: "2-digit", day: "2-digit" }).format(new Date());
  const recipeProductIds = [...new Set(recipeIdeas.ideas.flatMap((idea) => idea.ingredients.map(({ productKey }) => {
    const product = scenarioProducts.find((candidate) => candidate.key === productKey);
    if (!product) throw new Error(`Famille produit inconnue dans une hypothèse de recette : ${productKey}.`);
    return product.id;
  })))];
  const recipeProducts = await prisma.product.findMany({ where: { restaurantId: restaurant.id,
    id: { in: recipeProductIds } }, select: { id: true } });
  const recipeProductIdsFound = new Set(recipeProducts.map((product) => product.id));
  const recipeCandidates: Awaited<ReturnType<typeof createRecipeCandidate>>[] = [];
  for (const idea of recipeIdeas.ideas) {
    const ingredients = idea.ingredients.map(({ productKey, quantity, sourceDocumentId, sourceLineNumber }) => {
      const product = scenarioProducts.find((candidate) => candidate.key === productKey);
      if (!product || !recipeProductIdsFound.has(product.id))
        throw new Error(`Produit de catalogue absent pour la famille source ${productKey}.`);
      return { productId: product.id, quantity, sourceDocumentId, sourceLineNumber };
    });
    recipeCandidates.push(await createRecipeCandidate(restaurant.id, "demo-seed:recipe-ideas:v3",
      `demo-seed:recipe-candidate:${idea.key}:v3`, { name: idea.name, category: "Plat", prepTime: idea.prepTime,
        yieldPortions: idea.yieldPortions, effectiveFrom, ingredients }));
  }
  return { invoices, recipeIdeaSources, recipeCandidates, plan };
}
