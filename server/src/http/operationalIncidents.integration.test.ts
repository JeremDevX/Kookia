import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const owners: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: owners } } }); await prisma.$disconnect(); });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
async function account() {
  const client = request.agent(app);
  const created = await client.post("/api/auth/register").send({ displayName: "Incident fixture",
    email: `incident-${randomUUID()}@example.com`, password: "isolated incident password" }).expect(201);
  owners.push(created.body.user.id as string);
  await client.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: created.body.user.id as string } });
  return { client, restaurantId: restaurant.id };
}
async function operationState(restaurantId: string) {
  const [products, movements, productions, sales, orders] = await Promise.all([
    prisma.product.findMany({ where: { restaurantId }, select: { id: true, currentStock: true, stockRevision: true }, orderBy: { id: "asc" } }),
    prisma.stockMovement.count({ where: { restaurantId } }), prisma.production.count({ where: { restaurantId } }),
    prisma.dailySale.count({ where: { restaurantId } }), prisma.purchaseOrder.count({ where: { restaurantId } }),
  ]);
  return { products, movements, productions, sales, orders };
}
it("records contextual incidents and a chef response without creating stock, sales or purchases", async () => {
  const owner = await account();
  const product = await prisma.product.findFirstOrThrow({ where: { restaurantId: owner.restaurantId } });
  const initial = await operationState(owner.restaurantId);
  const body = { operationId: randomUUID(), serviceDate: today(), serviceSlot: "lunch", kind: "stockout",
    productId: product.id, lotId: null, orderLineId: null, recipeId: null, quantity: 1, unit: product.unit,
    note: "Produit indisponible pendant le service ; alternative à examiner." };
  const saved = await owner.client.post("/api/workspace/service-incidents").send(body).expect(201);
  expect(saved.body).toMatchObject({ status: "open", revision: 1, note: body.note });
  expect(saved.body.consequences.join(" ")).toContain("stock théorique");
  expect(saved.body.suggestions.length).toBeGreaterThan(0);
  const replay = await owner.client.post("/api/workspace/service-incidents").send(body).expect(201);
  expect(replay.body.id).toBe(saved.body.id);
  await owner.client.post("/api/workspace/service-incidents").send({ ...body, note: "Autre événement" }).expect(409);
  const decision = { operationId: randomUUID(), expectedRevision: 1, actionNote: "Alternative proposée ; préparation saisie séparément si réalisée." };
  const resolved = await owner.client.post(`/api/workspace/service-incidents/${saved.body.id}/resolve`).send(decision).expect(200);
  expect(resolved.body).toMatchObject({ status: "resolved", revision: 2, actionNote: decision.actionNote });
  await owner.client.post(`/api/workspace/service-incidents/${saved.body.id}/resolve`).send(decision).expect(200);
  await owner.client.post(`/api/workspace/service-incidents/${saved.body.id}/resolve`).send({ ...decision, operationId: randomUUID() }).expect(409);
  expect(await operationState(owner.restaurantId)).toEqual(initial);
  const events = await prisma.recommendationDecision.findMany({ where: { restaurantId: owner.restaurantId,
    decision: { in: ["incident_reported", "incident_resolved"] } } });
  expect(events).toHaveLength(2);
});
it("isolates references and decisions by restaurant and validates linked lots and units", async () => {
  const owner = await account(), other = await account();
  const foreign = await prisma.product.findFirstOrThrow({ where: { restaurantId: other.restaurantId } });
  const input = { operationId: randomUUID(), serviceDate: today(), serviceSlot: "dinner", kind: "unavailable",
    productId: foreign.id, lotId: null, orderLineId: null, recipeId: null, quantity: null, unit: null, note: "Vérifier le produit." };
  // Seed product IDs can coincide across tenants; a unique foreign ID proves isolation.
  const foreignSupplier = await prisma.supplier.findFirstOrThrow({ where: { restaurantId: other.restaurantId } });
  const unique = await prisma.product.create({ data: { id: randomUUID(), restaurantId: other.restaurantId, supplierId: foreignSupplier.id,
    name: "Foreign only", category: "Légumes", unit: "kg", currentStock: 0, minThreshold: 0, pricePerUnit: 1 } });
  await owner.client.post("/api/workspace/service-incidents").send({ ...input, productId: unique.id }).expect(400);
  const product = await prisma.product.findFirstOrThrow({ where: { restaurantId: owner.restaurantId } });
  await owner.client.post("/api/workspace/service-incidents").send({ ...input, productId: product.id, quantity: 2, unit: "incorrect" }).expect(400);
  await owner.client.post("/api/workspace/service-incidents").send({ ...input, kind: "lot_discarded", productId: product.id }).expect(400);
  const own = await owner.client.post("/api/workspace/service-incidents").send({ ...input, productId: product.id }).expect(201);
  await other.client.post(`/api/workspace/service-incidents/${own.body.id}/resolve`).send({ operationId: randomUUID(), expectedRevision: 1, actionNote: "Non autorisé" }).expect(404);
  const otherList = await other.client.get(`/api/workspace/service-incidents?from=${today()}&to=${today()}`).expect(200);
  expect(otherList.body).toEqual([]);
  await request(app).get(`/api/workspace/service-incidents?from=${today()}&to=${today()}`).expect(401);
});
