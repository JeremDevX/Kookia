import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { createRecipeCandidate } from "../application/workspace/recipeCandidateService.js";
import { createAnonymizedSourceInvoices } from "./fixtures/anonymizedSourceInvoices.js";
import { createDemoRecipeIdeaSourceInvoices } from "./fixtures/demoRecipeIdeaSourceInvoices.js";
import { applyRestaurantSimulation } from "./restaurantSimulationStorage.js";
import { assertSeedSnapshot, buildRecipePlan } from "./restaurantSimulationSupport.js";
import { buildRestaurantSimulation } from "./restaurantSimulationPlan.js";

function sourceDocument(invoice: ReturnType<typeof createAnonymizedSourceInvoices>[number]): Prisma.InputJsonObject {
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

export async function seedLocalDemoScenario(ownerId: string) {
  const restaurant = await ensureWorkspace(ownerId);
  const { productSnapshots, recipeSnapshots } = await assertFreshWorkspace(restaurant.id);
  const invoices = createAnonymizedSourceInvoices();
  const recipeIdeaSources = createDemoRecipeIdeaSourceInvoices();
  const plan = buildRestaurantSimulation(invoices, productSnapshots.map((product) => ({
    id: product.id, name: product.name, unit: product.unit, currentStock: product.currentStock,
    minThreshold: product.minThreshold, pricePerUnit: product.pricePerUnit,
    supplierId: product.supplierId, category: product.category,
  })), true);
  const plannedRecipes = buildRecipePlan(recipeSnapshots, plan.productions, plan.recipeVersions);
  const suppliers = await prisma.supplier.findMany({ where: { restaurantId: restaurant.id }, select: { id: true } });

  await prisma.workspaceDocument.createMany({ data: [...invoices, ...recipeIdeaSources].map((invoice) => ({
    restaurantId: restaurant.id, kind: `source-invoice:${invoice.id}`, data: sourceDocument(invoice),
  })) });
  await applyRestaurantSimulation(restaurant.id, plan, plannedRecipes, [], [], new Set(suppliers.map(({ id }) => id)));
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: {
    mode: "demo", name: "Restaurant de démonstration KookIA", type: "Restaurant de démonstration",
    address: "", city: "", phone: "", email: "demo@kookia.local", dailyCovers: 50,
  } });
  const effectiveFrom = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
    month: "2-digit", day: "2-digit" }).format(new Date());
  const recipeIdeas = [
    { key: "chicken-quiche", name: "Hypothèse — quiche au poulet", prepTime: 35, yieldPortions: 4,
      ingredients: [
        { sourceName: "Farine T55", quantity: 0.25 },
        { sourceName: "Oeufs", quantity: 4 },
        { sourceName: "Poulet Fermier", quantity: 0.15 },
        { sourceName: "Crème Fraîche", quantity: 0.2 },
      ] },
    { key: "pasta-gratin", name: "Hypothèse — gratin de pâtes au fromage", prepTime: 35, yieldPortions: 4,
      ingredients: [
        { sourceName: "Pâtes sèches", quantity: 0.12 },
        { sourceName: "Oeufs", quantity: 2 },
        { sourceName: "Crème Fraîche", quantity: 0.15 },
        { sourceName: "Mozzarella", quantity: 0.08 },
      ] },
  ] as const;
  const recipeProductNames = [...new Set(recipeIdeas.flatMap((idea) => idea.ingredients.map(({ sourceName }) => sourceName)))];
  const recipeProducts = await prisma.product.findMany({ where: { restaurantId: restaurant.id,
    name: { in: recipeProductNames } }, select: { id: true, name: true } });
  const recipeProductByName = new Map(recipeProducts.map((product) => [product.name, product]));
  const recipeCandidates: Awaited<ReturnType<typeof createRecipeCandidate>>[] = [];
  for (const idea of recipeIdeas) {
    const ingredients = idea.ingredients.map(({ sourceName, quantity }) => {
      const source = recipeIdeaSources.find((invoice) => invoice.stockLines.some((line) => line.name === sourceName));
      const line = source?.stockLines.find((stockLine) => stockLine.name === sourceName);
      const product = recipeProductByName.get(sourceName);
      if (!source || !line || !product) throw new Error(`Source ou produit de démonstration manquant : ${sourceName}.`);
      return { productId: product.id, quantity, sourceDocumentId: source.id, sourceLineNumber: line.sourceLineNumber };
    });
    recipeCandidates.push(await createRecipeCandidate(restaurant.id, "demo-seed:recipe-ideas:v2",
      `demo-seed:recipe-candidate:${idea.key}:v2`, { name: idea.name, category: "Plat", prepTime: idea.prepTime,
        yieldPortions: idea.yieldPortions, effectiveFrom, ingredients }));
  }
  return { invoices, recipeIdeaSources, recipeCandidates, plan };
}
