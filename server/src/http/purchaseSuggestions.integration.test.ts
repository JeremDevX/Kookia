import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ownerIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ownerIds } } }); await prisma.$disconnect(); });

async function account(name: string) {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: name,
    email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@example.com`, password: "purchase test password" }).expect(201);
  ownerIds.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, actorId: result.body.user.id as string, restaurantId: restaurant.id };
}

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());

async function seedSalesAndRecipe(tenant: Awaited<ReturnType<typeof account>>, productId: string,
  source: "manual" | "demo_simulation") {
  const saleItem = await tenant.agent.post("/api/workspace/sales/items").send({ name: "Plat suivi" }).expect(201);
  const today = parisToday();
  const asOf = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const date = (index: number) => new Date(Date.parse(asOf) + (index - 27) * 86_400_000);
  await prisma.serviceDay.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: tenant.restaurantId,
    serviceDate: date(index), status: "open" as const, coverage: "complete" as const,
    source: source === "demo_simulation" ? "demo_simulation" as const : "recorded" as const, actorId: tenant.actorId })) });
  await prisma.dailySale.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: tenant.restaurantId,
    saleItemId: saleItem.body.id as string, serviceDate: date(index), quantity: 10, source,
    operationId: randomUUID(), createdBy: tenant.actorId, updatedBy: tenant.actorId })) });
  const recipe = await tenant.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Recette suivie",
    category: "Plat", prepTime: 10, yieldPortions: 4, effectiveFrom: date(0).toISOString().slice(0, 10),
    ingredients: [{ productId, quantity: 2 }] }).expect(201);
  await tenant.agent.post("/api/workspace/sales/recipe-mappings").send({ saleItemId: saleItem.body.id,
    recipeId: recipe.body.id, expectedRevision: 0, operationId: randomUUID(),
    effectiveFrom: date(0).toISOString().slice(0, 10), portionsPerItem: 2 }).expect(201);
}

it("requires a current count, stores immutable suggestion decisions, rejects simulation purchases and marks demo orders", async () => {
  const owner = await account("Purchase owner");
  const other = await account("Purchase other");
  const demo = await account("Purchase demo");
  await prisma.restaurant.update({ where: { id: demo.restaurantId }, data: { mode: "demo" } });

  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0] as { id: string; name: string; unit: string; stockRevision: number };
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } },
    data: { currentStock: 2, stockRevision: { increment: 1 } } });
  await seedSalesAndRecipe(owner, product.id, "manual");

  const beforeCount = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(beforeCount.body).toMatchObject({ status: "ready", provenance: "recorded_sales", workspaceMode: "operational" });
  const suggestion = beforeCount.body.suggestions.find((item: { productId: string }) => item.productId === product.id);
  expect(suggestion).toMatchObject({ status: "needs_stock_count", forecastNeed: 10, countedStock: null,
    estimatedQuantity: null, canAdd: false });
  const fakeDecision = randomUUID();
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: fakeDecision, productId: product.id,
    productName: product.name, quantity: 1, unit: product.unit, source: "dashboard", purchaseSuggestionOperationId: fakeDecision }] }).expect(409);

  const currentProduct = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } } });
  await owner.agent.post(`/api/workspace/products/${product.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: currentProduct.stockRevision, expectedUnit: currentProduct.unit, countedQuantity: 2 }).expect(201);
  const afterCount = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  const ready = afterCount.body.suggestions.find((item: { productId: string }) => item.productId === product.id);
  expect(ready).toMatchObject({ status: "ready", canAdd: true, forecastNeed: 10, countedStock: 2, estimatedQuantity: 8 });
  await other.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({ operationId: randomUUID(),
    suggestionKey: ready.suggestionKey, decision: "added", quantity: 5 }).expect(409);

  const decisionInput = { operationId: randomUUID(), suggestionKey: ready.suggestionKey, decision: "added", quantity: 5 };
  const decision = await owner.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send(decisionInput).expect(201);
  expect(decision.body).toMatchObject({ decision: "purchase_suggestion_added", replayed: false });
  const decisionReplays = await Promise.all([1, 2].map(() => owner.agent
    .post(`/api/workspace/orders/suggestions/${product.id}/decision`).send(decisionInput).expect(201)));
  expect(decisionReplays.map((response) => response.body.id)).toEqual([decision.body.id, decision.body.id]);
  expect(decisionReplays.map((response) => response.body.replayed)).toEqual([true, true]);
  await owner.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({ ...decisionInput, quantity: 6 }).expect(409);
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: decision.body.operationId,
    productId: product.id, productName: "nom client ignoré", quantity: 5, unit: product.unit, source: "dashboard",
    purchaseSuggestionOperationId: decision.body.operationId }] }).expect(200);
  const stockBeforeOrder = Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id } } })).currentStock);
  const orderInput = { operationId: randomUUID(), lines: [{ productId: product.id, quantity: 4, cartId: decision.body.operationId }] };
  const order = await owner.agent.post("/api/workspace/orders").send(orderInput).expect(201);
  expect(order.body).toMatchObject({ status: "validated", lines: [{ productName: product.name, quantity: 4 }] });
  const savedDecision = await prisma.recommendationDecision.findFirstOrThrow({ where: { restaurantId: owner.restaurantId,
    operationId: orderInput.operationId } });
  expect(savedDecision.snapshot).toMatchObject({ workspaceMode: "operational", suggestions: [{ operationId: decision.body.operationId }] });
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id } } })).currentStock)).toBe(stockBeforeOrder);
  const orderReplays = await Promise.all([1, 2].map(() => owner.agent.post("/api/workspace/orders").send(orderInput).expect(201)));
  expect(orderReplays.map((response) => response.body.id)).toEqual([order.body.id, order.body.id]);
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: randomUUID(), productId: product.id,
    productName: product.name, quantity: 5, unit: product.unit, source: "dashboard",
    purchaseSuggestionOperationId: decision.body.operationId }] }).expect(409);
  await owner.agent.post("/api/workspace/orders").send({ ...orderInput, lines: [{ ...orderInput.lines[0], quantity: 3 }] }).expect(409);

  const demoCatalog = await demo.agent.get("/api/workspace/catalog").expect(200);
  const demoProduct = demoCatalog.body.products[0] as { id: string; name: string; unit: string };
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: demo.restaurantId, id: demoProduct.id } },
    data: { currentStock: 2, stockRevision: { increment: 1 } } });
  await seedSalesAndRecipe(demo, demoProduct.id, "manual");
  const demoProductState = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: demo.restaurantId, id: demoProduct.id } } });
  await demo.agent.post(`/api/workspace/products/${demoProduct.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: demoProductState.stockRevision, expectedUnit: demoProductState.unit, countedQuantity: 2 }).expect(201);
  const demoSuggestions = await demo.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(demoSuggestions.body).toMatchObject({ status: "ready", workspaceMode: "demo", provenance: "demo_simulation" });
  const demoSuggestion = demoSuggestions.body.suggestions.find((item: { productId: string }) => item.productId === demoProduct.id);
  expect(demoSuggestion).toMatchObject({ canAdd: true, estimatedQuantity: 8 });
  const demoDecision = await demo.agent.post(`/api/workspace/orders/suggestions/${demoProduct.id}/decision`).send({
    operationId: randomUUID(), suggestionKey: demoSuggestion.suggestionKey, decision: "added", quantity: 8 }).expect(201);
  await demo.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: demoDecision.body.operationId,
    productId: demoProduct.id, productName: demoProduct.name, quantity: 8, unit: demoProduct.unit,
    source: "dashboard", purchaseSuggestionOperationId: demoDecision.body.operationId }] }).expect(200);
  const demoOrderInput = { operationId: randomUUID(), lines: [{ productId: demoProduct.id, quantity: 8, cartId: demoDecision.body.operationId }] };
  expect((await demo.agent.post("/api/workspace/orders").send(demoOrderInput).expect(201)).body.status).toBe("simulated");
  const simulatedSales = await account("Purchase simulated source");
  await seedSalesAndRecipe(simulatedSales, (await simulatedSales.agent.get("/api/workspace/catalog").expect(200)).body.products[0].id,
    "demo_simulation");
  expect((await simulatedSales.agent.get("/api/workspace/orders/suggestions").expect(200)).body)
    .toMatchObject({ status: "simulation_only", provenance: "demo_simulation", workspaceMode: "operational", suggestions: [] });
  expect(await request(app).get("/api/workspace/orders/suggestions").expect(401).then((response) => response.body)).toHaveProperty("error");
});
