import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
const input = { name: "Test", type: "Restaurant", address: "", city: "Test", phone: "", email: "test@example.com", dailyCovers: 20, hasTerrace: false };
it("requires setup once per authenticated account without creating demo data", async () => {
  await request(app).get("/api/setup").expect(401);
  await request(app).post("/api/setup").send(input).expect(401);
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ displayName: "Test", email: `setup-${randomUUID()}@example.com`, password: "test setup password" }).expect(201);
  ids.push(registered.body.user.id);
  agent.set("X-Expected-User-Id", registered.body.user.id);
  const payload = { ...input, expectedUserId: ids[0] };
  await agent.post("/api/setup").send(input).expect(400);
  expect((await agent.get("/api/setup").expect(200)).body).toEqual({ configured: false, userId: ids[0], step: null, revision: 0 });
  expect((await agent.get("/api/workspace/catalog").expect(409)).body.error.code).toBe("SETUP_REQUIRED");
  expect(await prisma.restaurant.count({ where: { ownerId: ids[0] } })).toBe(0);
  await agent.post("/api/setup").send({ ...payload, dailyCovers: -1 }).expect(400);
  await agent.post("/api/setup").send({ ...payload, ownerId: randomUUID() }).expect(400);
  const results = await Promise.all([agent.post("/api/setup").send(payload), agent.post("/api/setup").send(payload)]);
  expect(results.map(result => result.status).sort()).toEqual([201, 409]);
  expect(results.find(result => result.status === 409)?.body.error.code).toBe("SETUP_ALREADY_COMPLETED");
  expect((await agent.get("/api/setup").expect(200)).body).toEqual({ configured: true, userId: ids[0], step: "team", revision: 1 });
  expect((await agent.get("/api/workspace/restaurant").expect(200)).body).toEqual(input);
  expect((await agent.get("/api/workspace/catalog").expect(200)).body).toEqual({ products: [], suppliers: [] });
  for (const path of ["recipes", "predictions", "notifications"]) {
    expect((await agent.get(`/api/workspace/${path}`).expect(200)).body).toEqual([]);
  }
  for (const path of ["analytics", "activity", "insights"]) {
    expect((await agent.get(`/api/workspace/${path}`).expect(200)).body).toBeNull();
  }
  expect((await agent.get("/api/workspace/menu").expect(200)).body).toEqual({
    starter: "", main: "", dessert: "", stockOptimizationText: null, reclaimedStockKg: null,
    criticalWindowHours: null, source: "manual", status: "draft", revision: 0,
  });
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: ids[0] } });
  for (const count of await Promise.all([
    prisma.product.count({ where: { restaurantId: restaurant.id } }),
    prisma.supplier.count({ where: { restaurantId: restaurant.id } }),
    prisma.recipe.count({ where: { restaurantId: restaurant.id } }),
    prisma.prediction.count({ where: { restaurantId: restaurant.id } }),
    prisma.workspaceDocument.count({ where: { restaurantId: restaurant.id, kind: { not: "onboarding" } } }),
    prisma.stockMovement.count({ where: { restaurantId: restaurant.id } }),
  ])) expect(count).toBe(0);
  expect((await agent.post("/api/setup").send(payload).expect(409)).body.error.code).toBe("SETUP_ALREADY_COMPLETED");
  const other = request.agent(app);
  const second = await other.post("/api/auth/register").send({ displayName: "Other", email: `setup-${randomUUID()}@example.com`, password: "test setup password" }).expect(201);
  ids.push(second.body.user.id);
  other.set("X-Expected-User-Id", second.body.user.id);
  expect((await other.get("/api/setup").expect(200)).body).toEqual({ configured: false, userId: ids[1], step: null, revision: 0 });
  expect((await other.get("/api/workspace/catalog").expect(409)).body.error.code).toBe("SETUP_REQUIRED");
  expect((await other.post("/api/setup").send(payload).expect(409)).body.error.code).toBe("SESSION_CHANGED");
  expect(await prisma.restaurant.count({ where: { ownerId: ids[1] } })).toBe(0);
  await other.post("/api/setup").send({ ...input, name: "Other", expectedUserId: ids[1] }).expect(201);
  expect((await agent.get("/api/workspace/restaurant").expect(200)).body.name).toBe("Test");
  expect((await other.get("/api/workspace/restaurant").expect(200)).body.name).toBe("Other");
  const supplier = { id: randomUUID(), name: "Fournisseur test", email: "supplier@example.com", phone: "" };
  await agent.post("/api/workspace/suppliers").send(supplier).expect(201);
  const product = { operationId: randomUUID(), name: "Produit test", category: "Test", currentStock: 1,
    minThreshold: 0, unit: "kg", pricePerUnit: 2, supplierId: supplier.id };
  const created = await agent.post("/api/workspace/products").send(product).expect(201);
  const catalog = (await agent.get("/api/workspace/catalog").expect(200)).body;
  expect(catalog.suppliers).toEqual([expect.objectContaining(supplier)]);
  expect(catalog.products).toEqual([expect.objectContaining({ id: created.body.id, name: product.name, supplierId: supplier.id })]);
  expect((await other.get("/api/workspace/catalog").expect(200)).body).toEqual({ products: [], suppliers: [] });

});

it("resumes and safely advances setup while preserving legacy workspaces", async () => {
  const agent = request.agent(app), other = request.agent(app);
  for (const current of [agent, other]) {
    const registered = await current.post("/api/auth/register").send({ displayName: "Test", email: `progress-${randomUUID()}@example.com`, password: "test progress password" }).expect(201);
    ids.push(registered.body.user.id);
  }
  const owner = ids.at(-2)!, legacy = ids.at(-1)!;
  expect((await agent.patch("/api/setup/step").send({ expectedUserId: owner, expectedStep: "team", nextStep: "suppliers", expectedRevision: 1 }).expect(409)).body.error.code).toBe("SETUP_REQUIRED");
  expect((await agent.post("/api/setup").send({ ...input, expectedUserId: owner }).expect(201)).body).toEqual({ configured: true, userId: owner, step: "team", revision: 1 });
  await prisma.restaurant.create({ data: { ...input, ownerId: legacy } });
  expect((await other.get("/api/setup").expect(200)).body).toEqual({ configured: true, userId: legacy, step: null, revision: 0 });
  expect(await prisma.workspaceDocument.count({ where: { restaurant: { ownerId: legacy }, kind: "onboarding" } })).toBe(0);
  const move = { expectedUserId: owner, expectedStep: "team", nextStep: "suppliers", expectedRevision: 1 };
  expect((await other.patch("/api/setup/step").send(move).expect(409)).body.error.code).toBe("SESSION_CHANGED");
  await agent.patch("/api/setup/step").send({ ...move, nextStep: "review" }).expect(400);
  await agent.patch("/api/setup/step").send({ ...move, expectedRevision: 0 }).expect(400);
  const replies = await Promise.all([agent.patch("/api/setup/step").send(move), agent.patch("/api/setup/step").send(move)]);
  for (const reply of replies) expect(reply.body).toEqual({ configured: true, userId: owner, step: "suppliers", revision: 2 });
  expect((await agent.get("/api/setup").expect(200)).body).toEqual({ configured: true, userId: owner, step: "suppliers", revision: 2 });
  await agent.patch("/api/setup/step").send({ expectedUserId: owner, expectedStep: "suppliers", nextStep: "team", expectedRevision: 2 }).expect(200);
  expect((await agent.patch("/api/setup/step").send(move).expect(409)).body.error.code).toBe("REVISION_CONFLICT");
  await agent.patch("/api/setup/step").send({ ...move, expectedRevision: 3 }).expect(200);
  await agent.patch("/api/setup/step").send({ expectedUserId: owner, expectedStep: "suppliers", nextStep: "review", expectedRevision: 4 }).expect(200);
  await agent.patch("/api/setup/step").send({ expectedUserId: owner, expectedStep: "review", nextStep: null, expectedRevision: 5 }).expect(200);
  expect((await agent.get("/api/setup").expect(200)).body).toEqual({ configured: true, userId: owner, step: null, revision: 6 });
  expect((await other.patch("/api/setup/step").send({ ...move, expectedUserId: legacy }).expect(409)).body.error.code).toBe("REVISION_CONFLICT");
});

it("rejects malformed onboarding state without changing it", async () => {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({ displayName: "Test", email: `invalid-progress-${randomUUID()}@example.com`, password: "test progress password" }).expect(201);
  const userId = registered.body.user.id as string;
  ids.push(userId);
  await agent.post("/api/setup").send({ ...input, expectedUserId: userId }).expect(201);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: userId } });
  const where = { restaurantId_kind: { restaurantId: restaurant.id, kind: "onboarding" } };
  await prisma.workspaceDocument.update({ where, data: { data: { version: 1, step: "invalid" } } });
  const before = await prisma.workspaceDocument.findUniqueOrThrow({ where });
  await agent.get("/api/setup").expect(500);
  await agent.patch("/api/setup/step").send({ expectedUserId: userId, expectedStep: "team", nextStep: "suppliers", expectedRevision: 1 }).expect(500);
  expect(await prisma.workspaceDocument.findUniqueOrThrow({ where })).toEqual(before);
});
