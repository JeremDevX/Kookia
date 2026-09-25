import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ownerIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ownerIds } } }); await prisma.$disconnect(); });

async function account(name: string) {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ displayName: name,
    email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@example.com`,
    password: "estimate integration password" }).expect(201);
  ownerIds.push(registered.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: registered.body.user.id } });
  return { agent, actorId: registered.body.user.id as string, restaurantId: restaurant.id };
}

async function addReceipt(tenant: Awaited<ReturnType<typeof account>>, product: { id: string; name: string; unit: string;
  supplierId: string; pricePerUnit: number }, deliveryDate: string,
  options: { simulated?: boolean; receivedQuantity?: number } = {}) {
  const { simulated = false, receivedQuantity = 10 } = options;
  const order = await prisma.purchaseOrder.create({ data: { restaurantId: tenant.restaurantId, actorId: tenant.actorId,
    operationId: randomUUID(), status: simulated ? "simulated_received" : "received",
    lines: { create: { productId: product.id, productName: product.name,
      supplierId: product.supplierId, supplierName: "Fournisseur", quantity: receivedQuantity, unit: product.unit,
      pricePerUnit: product.pricePerUnit } } }, include: { lines: true } });
  const receiptId = randomUUID();
  await prisma.purchaseReceipt.create({ data: { id: receiptId, restaurantId: tenant.restaurantId, orderId: order.id,
    supplierId: product.supplierId, actorId: tenant.actorId, operationId: randomUUID(),
    invoiceReference: `FACT-${receiptId}`, invoiceReferenceNormalized: `FACT-${receiptId}`,
    invoiceDocumentId: randomUUID(), invoiceDocumentRevision: 1, deliveryReference: `BL-${receiptId}`,
    deliveryDate: new Date(`${deliveryDate}T00:00:00.000Z`), simulated,
    provenance: simulated ? "demo_simulation" : "recorded", invoiceComplete: true, requestSnapshot: {},
    lines: { create: { orderLineId: order.lines[0].id, productId: product.id,
      productName: product.name, invoiceLineIndex: 0, invoiceQuantity: receivedQuantity, receivedQuantity,
      quantityDifference: 0, unit: product.unit, orderedQuantity: receivedQuantity, orderedUnitPrice: product.pricePerUnit,
      invoiceUnitPrice: product.pricePerUnit } } } });
}

it("estimates only dated recipes from recorded in-scope receipts without creating operational rows", async () => {
  await request(app).get("/api/workspace/ingredient-outflow-estimates?from=2022-01-01&to=2026-12-31").expect(401);
  const owner = await account("Estimate owner");
  const other = await account("Estimate other");
  const ownerCatalog = (await owner.agent.get("/api/workspace/catalog").expect(200)).body;
  type CatalogProduct = { id: string; name: string; unit: string; supplierId: string; pricePerUnit: number };
  const catalogProducts = ownerCatalog.products as CatalogProduct[];
  const products = new Map<string, CatalogProduct>(catalogProducts.map((item) => [item.name, item]));
  const recipeIngredients = [
    { name: "Farine T55", quantity: 0.8, receivedQuantity: 8,
      expected: { possiblePortions: 40, estimatedSoldPortions: 36, estimatedLossPortions: 4,
        estimatedSoldQuantity: 7.2, estimatedLossQuantity: 0.8 } },
    { name: "Tomates", quantity: 0.4, receivedQuantity: 8,
      expected: { possiblePortions: 80, estimatedSoldPortions: 72, estimatedLossPortions: 8,
        estimatedSoldQuantity: 7.2, estimatedLossQuantity: 0.8 } },
    { name: "Mozzarella", quantity: 0.48, receivedQuantity: 4,
      expected: { possiblePortions: 33.333, estimatedSoldPortions: 30, estimatedLossPortions: 3.333,
        estimatedSoldQuantity: 3.6, estimatedLossQuantity: 0.4 } },
    { name: "Huile d'olive", quantity: 0.08, receivedQuantity: 1,
      expected: { possiblePortions: 50, estimatedSoldPortions: 45, estimatedLossPortions: 5,
        estimatedSoldQuantity: 0.9, estimatedLossQuantity: 0.1 } },
  ].map((ingredient) => ({ ...ingredient, product: products.get(ingredient.name) }));
  expect(recipeIngredients.every((ingredient) => ingredient.product)).toBe(true);
  await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Pizza Margherita",
    category: "Plat", prepTime: 25, yieldPortions: 4, effectiveFrom: "2020-01-01",
    ingredients: recipeIngredients.map((ingredient) => ({ productId: ingredient.product!.id,
      quantity: ingredient.quantity })) }).expect(201);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit" }).format(new Date());
  for (const ingredient of recipeIngredients) {
    await addReceipt(owner, ingredient.product!, today, { receivedQuantity: ingredient.receivedQuantity });
  }
  const tomato = recipeIngredients.find((ingredient) => ingredient.name === "Tomates")!;
  await addReceipt(owner, tomato.product!, today, { simulated: true, receivedQuantity: 10 });
  await addReceipt(owner, tomato.product!, "2021-12-31", { receivedQuantity: 2 });
  await addReceipt(owner, tomato.product!, "2027-01-01", { receivedQuantity: 2 });

  const otherCatalog = (await other.agent.get("/api/workspace/catalog").expect(200)).body;
  const otherProduct = otherCatalog.products.find((item: { unit: string }) => item.unit === "kg");
  await other.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Soupe de tomates",
    category: "Plat", prepTime: 30, yieldPortions: 5, effectiveFrom: "2026-01-01",
    ingredients: [{ productId: otherProduct.id, quantity: 2.5 }] }).expect(201);
  await addReceipt(other, otherProduct, today);

  const salesBefore = await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } });
  const movementsBefore = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const productionsBefore = await prisma.production.count({ where: { restaurantId: owner.restaurantId } });
  const readStock = async () => (await prisma.product.findMany({
    where: { restaurantId: owner.restaurantId, id: { in: recipeIngredients.map((ingredient) => ingredient.product!.id) } },
    orderBy: { id: "asc" }, select: { id: true, currentStock: true },
  })).map(({ id, currentStock }) => ({ id, currentStock: Number(currentStock) }));
  const stockBefore = await readStock();
  const response = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200);
  expect(response.body).toMatchObject({ assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 } });
  expect(response.body.estimates).toHaveLength(recipeIngredients.length);
  for (const ingredient of recipeIngredients) {
    const estimate = response.body.estimates.find((item: { productId: string }) => item.productId === ingredient.product!.id);
    expect(estimate).toMatchObject({ productId: ingredient.product!.id,
      receivedQuantity: ingredient.receivedQuantity, recipeName: "Pizza Margherita", recipeVersion: 1,
      ...ingredient.expected });
  }
  expect((await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2021-12-31", to: "2021-12-31" }).expect(200)).body.estimates).toMatchObject([
    { productId: tomato.product!.id, deliveryDate: "2021-12-31", receivedQuantity: 2,
      recipeName: "Pizza Margherita", possiblePortions: 20 },
  ]);
  expect((await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2027-01-01", to: "2027-01-01" }).expect(200)).body.estimates).toMatchObject([
    { productId: tomato.product!.id, deliveryDate: "2027-01-01", receivedQuantity: 2,
      recipeName: "Pizza Margherita", possiblePortions: 20 },
  ]);
  const otherEstimates = (await other.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200)).body.estimates;
  expect(otherEstimates).toMatchObject([
    { productId: otherProduct.id, recipeName: "Soupe de tomates" },
  ]);
  expect(otherEstimates).toHaveLength(1);
  await owner.agent.get("/api/workspace/ingredient-outflow-estimates").query({ from: "2026-12-31", to: "2026-01-01" }).expect(400);
  expect(await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } })).toBe(salesBefore);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(movementsBefore);
  expect(await prisma.production.count({ where: { restaurantId: owner.restaurantId } })).toBe(productionsBefore);
  expect(await readStock()).toEqual(stockBefore);
});
