import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { createAnonymizedSourceInvoices } from "./fixtures/anonymizedSourceInvoices.js";
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
  const plan = buildRestaurantSimulation(invoices, productSnapshots.map((product) => ({
    id: product.id, name: product.name, unit: product.unit, currentStock: product.currentStock,
    minThreshold: product.minThreshold, pricePerUnit: product.pricePerUnit,
    supplierId: product.supplierId, category: product.category,
  })));
  const plannedRecipes = buildRecipePlan(recipeSnapshots, plan.productions);
  const suppliers = await prisma.supplier.findMany({ where: { restaurantId: restaurant.id }, select: { id: true } });

  await prisma.workspaceDocument.createMany({ data: invoices.map((invoice) => ({
    restaurantId: restaurant.id, kind: `source-invoice:${invoice.id}`, data: sourceDocument(invoice),
  })) });
  await applyRestaurantSimulation(restaurant.id, plan, plannedRecipes, [], [], new Set(suppliers.map(({ id }) => id)));
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: {
    mode: "demo", name: "Restaurant de démonstration KookIA", type: "Restaurant de démonstration",
    address: "", city: "", phone: "", email: "demo@kookia.local", dailyCovers: 50,
  } });
  return { invoices, plan };
}
