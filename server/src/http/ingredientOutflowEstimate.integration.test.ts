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
  supplierId: string; pricePerUnit: number }, deliveryDate: string, simulated = false) {
  const order = await prisma.purchaseOrder.create({ data: { restaurantId: tenant.restaurantId, actorId: tenant.actorId,
    operationId: randomUUID(), status: simulated ? "simulated_received" : "received",
    lines: { create: { productId: product.id, productName: product.name,
      supplierId: product.supplierId, supplierName: "Fournisseur", quantity: 20, unit: product.unit,
      pricePerUnit: product.pricePerUnit } } }, include: { lines: true } });
  const receiptId = randomUUID();
  await prisma.purchaseReceipt.create({ data: { id: receiptId, restaurantId: tenant.restaurantId, orderId: order.id,
    supplierId: product.supplierId, actorId: tenant.actorId, operationId: randomUUID(),
    invoiceReference: `FACT-${receiptId}`, invoiceReferenceNormalized: `FACT-${receiptId}`,
    invoiceDocumentId: randomUUID(), invoiceDocumentRevision: 1, deliveryReference: `BL-${receiptId}`,
    deliveryDate: new Date(`${deliveryDate}T00:00:00.000Z`), simulated,
    provenance: simulated ? "demo_simulation" : "recorded", invoiceComplete: true, requestSnapshot: {},
    lines: { create: { orderLineId: order.lines[0].id, productId: product.id,
      productName: product.name, invoiceLineIndex: 0, invoiceQuantity: 10, receivedQuantity: 10,
      quantityDifference: 0, unit: product.unit, orderedQuantity: 20, orderedUnitPrice: product.pricePerUnit,
      invoiceUnitPrice: product.pricePerUnit } } } });
}

it("estimates only dated recipes from recorded in-scope receipts without creating operational rows", async () => {
  await request(app).get("/api/workspace/ingredient-outflow-estimates?from=2022-01-01&to=2026-12-31").expect(401);
  const owner = await account("Estimate owner");
  const other = await account("Estimate other");
  const ownerCatalog = (await owner.agent.get("/api/workspace/catalog").expect(200)).body;
  const product = ownerCatalog.products.find((item: { unit: string }) => item.unit === "kg");
  expect(product).toBeDefined();
  await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Pâtes aux tomates",
    category: "Plat", prepTime: 25, yieldPortions: 4, effectiveFrom: "2026-01-01",
    ingredients: [{ productId: product.id, quantity: 2 }] }).expect(201);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit" }).format(new Date());
  await addReceipt(owner, product, today);
  await addReceipt(owner, product, today, true);

  const otherCatalog = (await other.agent.get("/api/workspace/catalog").expect(200)).body;
  const otherProduct = otherCatalog.products.find((item: { unit: string }) => item.unit === "kg");
  await other.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Soupe de tomates",
    category: "Plat", prepTime: 30, yieldPortions: 5, effectiveFrom: "2026-01-01",
    ingredients: [{ productId: otherProduct.id, quantity: 2.5 }] }).expect(201);
  await addReceipt(other, otherProduct, today);

  const salesBefore = await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } });
  const movementsBefore = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const response = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200);
  expect(response.body).toMatchObject({ assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 } });
  expect(response.body.estimates).toHaveLength(1);
  expect(response.body.estimates[0]).toMatchObject({ productId: product.id, receivedQuantity: 10,
    recipeName: "Pâtes aux tomates", recipeVersion: 1, possiblePortions: 20, estimatedSoldPortions: 18,
    estimatedLossPortions: 2, estimatedSoldQuantity: 9, estimatedLossQuantity: 1 });
  expect((await other.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: "2022-01-01", to: "2026-12-31" }).expect(200)).body.estimates).toHaveLength(1);
  await owner.agent.get("/api/workspace/ingredient-outflow-estimates").query({ from: "2026-12-31", to: "2026-01-01" }).expect(400);
  expect(await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } })).toBe(salesBefore);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(movementsBefore);
});
