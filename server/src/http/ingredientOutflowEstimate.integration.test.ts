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
  const deliveryReference = `BL-${receiptId}`;
  const receipt = await prisma.purchaseReceipt.create({ data: { id: receiptId, restaurantId: tenant.restaurantId, orderId: order.id,
    supplierId: product.supplierId, actorId: tenant.actorId, operationId: randomUUID(),
    invoiceReference: `FACT-${receiptId}`, invoiceReferenceNormalized: `FACT-${receiptId}`,
    invoiceDocumentId: randomUUID(), invoiceDocumentRevision: 1, deliveryReference,
    deliveryDate: new Date(`${deliveryDate}T00:00:00.000Z`), simulated,
    provenance: simulated ? "demo_simulation" : "recorded", invoiceComplete: true, requestSnapshot: {},
    lines: { create: { orderLineId: order.lines[0].id, productId: product.id,
      productName: product.name, invoiceLineIndex: 0, invoiceQuantity: receivedQuantity, receivedQuantity,
      quantityDifference: 0, unit: product.unit, orderedQuantity: receivedQuantity, orderedUnitPrice: product.pricePerUnit,
      invoiceUnitPrice: product.pricePerUnit } } }, include: { lines: true } });
  return { id: receipt.id, lineId: receipt.lines[0].id, deliveryReference };
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
  const unmatchedProduct = (await owner.agent.post("/api/workspace/products").send({ operationId: randomUUID(),
    name: "Crème fleurette sans recette", category: "Fixture", currentStock: 0, minThreshold: 0, unit: "L",
    pricePerUnit: 3, supplierId: recipeIngredients[0].product!.supplierId }).expect(201)).body as CatalogProduct;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit" }).format(new Date());
  for (const ingredient of recipeIngredients) {
    await addReceipt(owner, ingredient.product!, today, { receivedQuantity: ingredient.receivedQuantity });
  }
  const unmatchedReceipt = await addReceipt(owner, unmatchedProduct, today, { receivedQuantity: 3 });
  const tomato = recipeIngredients.find((ingredient) => ingredient.name === "Tomates")!;
  const simulatedReceipt = await addReceipt(owner, tomato.product!, today, { simulated: true, receivedQuantity: 10 });
  await addReceipt(owner, tomato.product!, "2021-12-31", { receivedQuantity: 2 });
  await addReceipt(owner, tomato.product!, "2027-01-01", { receivedQuantity: 2 });

  const otherCatalog = (await other.agent.get("/api/workspace/catalog").expect(200)).body;
  const otherProduct = otherCatalog.products.find((item: { unit: string }) => item.unit === "kg");
  await other.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Soupe de tomates",
    category: "Plat", prepTime: 30, yieldPortions: 5, effectiveFrom: "2026-01-01",
    ingredients: [{ productId: otherProduct.id, quantity: 2.5 }] }).expect(201);
  const otherReceipt = await addReceipt(other, otherProduct, today);

  const salesBefore = await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } });
  const movementsBefore = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const productionsBefore = await prisma.production.count({ where: { restaurantId: owner.restaurantId } });
  const readStock = async () => (await prisma.product.findMany({
    where: { restaurantId: owner.restaurantId,
      id: { in: [...recipeIngredients.map((ingredient) => ingredient.product!.id), unmatchedProduct.id] } },
    orderBy: { id: "asc" }, select: { id: true, currentStock: true },
  })).map(({ id, currentStock }) => ({ id, currentStock: Number(currentStock) }));
  const stockBefore = await readStock();
  const response = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200);
  expect(response.body).toMatchObject({ assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 } });
  expect(response.body.estimates).toHaveLength(recipeIngredients.length);
  expect(response.body.unestimatedReceipts).toEqual([{
    id: unmatchedReceipt.lineId, receiptId: unmatchedReceipt.id, receiptReference: unmatchedReceipt.deliveryReference,
    deliveryDate: today, productId: unmatchedProduct.id, productName: unmatchedProduct.name,
    unit: "L", receivedQuantity: 3, reason: "no_dated_compatible_recipe",
  }]);
  for (const ingredient of recipeIngredients) {
    const estimate = response.body.estimates.find((item: { productId: string }) => item.productId === ingredient.product!.id);
    expect(estimate).toMatchObject({ productId: ingredient.product!.id,
      receivedQuantity: ingredient.receivedQuantity, recipeName: "Pizza Margherita", recipeVersion: 1,
      ...ingredient.expected });
  }
  const recipeOperationId = randomUUID();
  const reviewedRecipe = { operationId: recipeOperationId, name: "Sauce à la crème", category: "Plat", prepTime: 15,
    yieldPortions: 4, effectiveFrom: today, sourceReceiptLineId: unmatchedReceipt.lineId,
    ingredients: [{ productId: unmatchedProduct.id, quantity: 0.6 }] };
  const savedRecipe = await owner.agent.post("/api/workspace/recipes").send(reviewedRecipe).expect(201);
  expect(await owner.agent.post("/api/workspace/recipes").send(reviewedRecipe).expect(201).then((result) => result.body.id))
    .toBe(savedRecipe.body.id);
  expect(await prisma.recommendationDecision.findFirst({ where: { restaurantId: owner.restaurantId,
    operationId: recipeOperationId }, select: { decision: true, snapshot: true } })).toMatchObject({
    decision: "recipe_created_from_receipt_estimate", snapshot: { source: { receiptLineId: unmatchedReceipt.lineId,
      receiptId: unmatchedReceipt.id, reference: unmatchedReceipt.deliveryReference, deliveryDate: today,
      productId: unmatchedProduct.id, productName: unmatchedProduct.name, receivedQuantity: 3, unit: "L" },
      recipe: { name: "Sauce à la crème", effectiveFrom: today } },
  });
  await owner.agent.post("/api/workspace/recipes").send({ ...reviewedRecipe, operationId: randomUUID(), effectiveFrom: "2020-01-01" })
    .expect(409).expect(({ body }) => expect(body.error.code).toBe("RECIPE_PRECEDES_RECEIPT"));
  await owner.agent.post("/api/workspace/recipes").send({ ...reviewedRecipe, operationId: randomUUID(),
    ingredients: [{ productId: tomato.product!.id, quantity: 0.3 }] })
    .expect(409).expect(({ body }) => expect(body.error.code).toBe("SOURCE_PRODUCT_NOT_IN_RECIPE"));
  await owner.agent.post("/api/workspace/recipes").send({ ...reviewedRecipe, operationId: randomUUID(),
    sourceReceiptLineId: simulatedReceipt.lineId }).expect(409)
    .expect(({ body }) => expect(body.error.code).toBe("SIMULATED_RECEIPT_NOT_ELIGIBLE"));
  await owner.agent.post("/api/workspace/recipes").send({ ...reviewedRecipe, operationId: randomUUID(),
    sourceReceiptLineId: otherReceipt.lineId }).expect(404)
    .expect(({ body }) => expect(body.error.code).toBe("RECEIPT_LINE_NOT_FOUND"));
  const afterRecipeReview = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200);
  expect(afterRecipeReview.body.estimates).toContainEqual(expect.objectContaining({
    productId: unmatchedProduct.id, receivedQuantity: 3, recipeName: "Sauce à la crème",
    possiblePortions: 20, estimatedSoldQuantity: 2.7, estimatedLossQuantity: 0.3,
  }));
  expect(afterRecipeReview.body.unestimatedReceipts).toEqual([]);
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
