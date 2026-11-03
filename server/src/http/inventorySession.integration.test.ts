import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { createApp } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const app = createApp();
app.set("trust proxy", true);
let client = 0;
const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function setup() {
  const agent = request.agent(app);
  agent.set("X-Forwarded-For", `10.0.0.${++client}`);
  const account = await agent.post("/api/auth/register").send({ displayName: "Test", email: `${randomUUID()}@example.test`, password: "test password for inventory" }).expect(201);
  const id = account.body.user.id as string; users.push(id); agent.set("X-Expected-User-Id", id);
  await agent.post("/api/setup").send({ expectedUserId: id, name: "Test", type: "Restaurant", address: "", city: "Test", phone: "", email: "test@example.test", dailyCovers: 20 }).expect(201);
  const supplierId = randomUUID();
  await agent.post("/api/workspace/suppliers").send({ id: supplierId, name: "Test", email: "test@example.test", phone: "" }).expect(201);
  const productIds = [randomUUID(), randomUUID()];
  for (const [index, productId] of productIds.entries()) await agent.post("/api/workspace/products").send({ operationId: productId, name: `Test ${index}`, category: "Test", currentStock: 10, unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId }).expect(201);
  return { agent, productIds, id };
}
it("protège le contexte de l’établissement pour le propriétaire et les membres", async () => {
  const { agent, id, productIds } = await setup();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: id } });
  const member = request.agent(app);
  member.set("X-Forwarded-For", `10.0.0.${++client}`);
  const account = await member.post("/api/auth/register").send({ displayName: "Membre", email: `${randomUUID()}@example.test`, password: "test password for inventory" }).expect(201);
  const memberId = account.body.user.id as string; users.push(memberId); member.set("X-Expected-User-Id", memberId);
  await prisma.membership.create({ data: { userId: memberId, restaurantId: restaurant.id, role: "kitchen" } });
  const wrongRestaurant = randomUUID();
  expect((await agent.get("/api/workspace/inventory-session/context").expect(200)).body).toEqual({ restaurantId: restaurant.id });
  const deniedOpen = await agent.post("/api/workspace/inventory-session").set("X-Expected-Restaurant-Id", wrongRestaurant).expect(409);
  expect(deniedOpen.body.error.code).toBe("WORKSPACE_CHANGED");
  expect((await agent.get("/api/workspace/inventory-session").expect(200)).body).toBeNull();
  const draft = (await agent.post("/api/workspace/inventory-session").set("X-Expected-Restaurant-Id", restaurant.id).expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: 8, reason: "Écart" }));
  for (const role of ["kitchen", "chef"] as const) {
    await prisma.membership.update({ where: { userId: memberId }, data: { role } });
    expect((await member.get("/api/workspace/inventory-session/context").expect(200)).body).toEqual({ restaurantId: restaurant.id });
    for (const [method, path, body] of [
      ["put", `/api/workspace/inventory-session/${draft.id}`, { revision: draft.revision, lines }],
      ["post", `/api/workspace/inventory-session/${draft.id}/validate`, { revision: draft.revision }],
      ["post", `/api/workspace/inventory-session/${draft.id}/refresh`, { revision: draft.revision }],
      ["post", `/api/workspace/inventory-session/${draft.id}/discard`, { revision: draft.revision }],
    ] as const) {
      const response = await member[method](path).set("X-Expected-Restaurant-Id", wrongRestaurant).send(body).expect(409);
      expect(response.body.error.code).toBe("WORKSPACE_CHANGED");
    }
  }
  expect((await agent.get("/api/workspace/inventory-session").expect(200)).body).toEqual(draft);
  expect((await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body).toHaveLength(0);
});
it("conserve le brouillon sans mouvement puis valide une seule fois les produits comptés", async () => {
  const { agent, productIds } = await setup();
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: line.productId === productIds[0] ? 8 : null, reason: line.productId === productIds[0] ? "Casse" : "" }));
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  const replay = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  expect(replay.revision).toBe(saved.revision);
  expect((await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body).toHaveLength(0);
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).expect(200);
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).expect(200);
  const history = (await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body;
  expect(history).toHaveLength(1); expect(history[0].inventoryReason).toBe("Casse");
  expect((await agent.get(`/api/workspace/products/${productIds[1]}/counts`).expect(200)).body).toHaveLength(0);
});
it("annule toute la validation si un stock a changé et garde le brouillon", async () => {
  const { agent, productIds } = await setup();
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: 8, reason: "Casse" }));
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  await agent.post(`/api/workspace/products/${productIds[1]}/counts`).send({ operationId: randomUUID(), expectedStockRevision: 1, expectedUnit: "kg", countedQuantity: 9 }).expect(201);
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).expect(409);
  expect((await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body).toHaveLength(0);
  expect((await agent.get("/api/workspace/inventory-session").expect(200)).body.lines.map((line: { countedQuantity: number }) => line.countedQuantity)).toEqual([8, 8]);
  const refreshed = (await agent.post(`/api/workspace/inventory-session/${draft.id}/refresh`).send({ revision: saved.revision }).expect(200)).body;
  expect(refreshed.lines.map((line: { countedQuantity: number | null }) => line.countedQuantity)).toEqual([8, null]);
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: refreshed.revision }).expect(200);
  expect((await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body).toHaveLength(1);
});
it("permet d’actualiser le brouillon si un produit compté a été supprimé", async () => {
  const { agent, productIds, id } = await setup();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: id } });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { restaurantId: restaurant.id } });
  const deletedId = randomUUID();
  await prisma.product.create({ data: { id: deletedId, restaurantId: restaurant.id, name: "Produit supprimé", category: "Test",
    currentStock: 10, unit: "kg", minThreshold: 1, supplierId: supplier.id, pricePerUnit: 1 } });
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: 8, reason: "Écart" }));
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  await prisma.product.delete({ where: { restaurantId_id: { restaurantId: restaurant.id, id: deletedId } } });
  const response = await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).expect(409);
  expect(response.body.error.code).toBe("STOCK_CHANGED");
  expect((await agent.get(`/api/workspace/products/${productIds[0]}/counts`).expect(200)).body).toHaveLength(0);
  const refreshed = (await agent.post(`/api/workspace/inventory-session/${draft.id}/refresh`).send({ revision: saved.revision }).expect(200)).body;
  expect(refreshed.lines.find((line: { productId: string }) => line.productId === deletedId)).toMatchObject({ available: false, countedQuantity: null });
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: refreshed.revision }).expect(200);
});
it("protège les brouillons entre établissements et exige une justification des écarts", async () => {
  const { agent } = await setup();
  const other = await setup();
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  await other.agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: draft.revision }).expect(404);
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: 8, reason: "" }));
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines: lines.map((line: { productId: string }) => ({ ...line, countedQuantity: 7 })) }).expect(409);
  await agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).expect(400);
  expect((await agent.get("/api/workspace/inventory-session").expect(200)).body.revision).toBe(saved.revision);
});

it("ne bloque pas une modification concurrente qui détient déjà le produit", async () => {
  const { agent, productIds, id } = await setup();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: id } });
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }) => ({ productId: line.productId, countedQuantity: 8, reason: "Écart" }));
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  let release!: () => void; let locked!: () => void;
  const ready = new Promise<void>((resolve) => { locked = resolve; });
  const proceed = new Promise<void>((resolve) => { release = resolve; });
  const adjustment = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurant.id} AND id = ${productIds[0]} FOR UPDATE`;
    locked(); await proceed;
    await tx.product.update({ where: { restaurantId_id: { restaurantId: restaurant.id, id: productIds[0] } }, data: { currentStock: { decrement: 1 }, stockRevision: { increment: 1 } } });
    await tx.stockMovement.create({ data: { restaurantId: restaurant.id, productId: productIds[0], delta: -1, reason: "adjustment", operationId: randomUUID(), actorId: id,
      productNameSnapshot: "Test", productUnitSnapshot: "kg", supplierNameSnapshot: "Test", unitPriceSnapshot: 1 } });
  }, { timeout: 10000 });
  await ready;
  const validation = agent.post(`/api/workspace/inventory-session/${draft.id}/validate`).send({ revision: saved.revision }).then((response) => response);
  await new Promise((resolve) => setTimeout(resolve, 100));
  release(); await adjustment;
  expect((await validation).status).toBe(409);
}, 15000);

it("enregistre un inventaire dépassant la limite JSON générale", async () => {
  const { agent, id } = await setup();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: id } });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { restaurantId: restaurant.id } });
  await prisma.product.createMany({ data: Array.from({ length: 1000 }, (_, index) => ({ id: randomUUID(), restaurantId: restaurant.id,
    name: `Produit ${index}`, category: "Test", currentStock: 10, unit: "kg", minThreshold: 1, supplierId: supplier.id, pricePerUnit: 1 })) });
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  const lines = draft.lines.map((line: { productId: string }, index: number) => ({ productId: line.productId, countedQuantity: index === 1 ? 8 : null, reason: index === 1 ? "Écart" : "" }));
  expect(JSON.stringify(lines).length).toBeGreaterThan(16384);
  await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, padding: "x".repeat(2 * 1024 * 1024) }).expect(413);
  const saved = (await agent.put(`/api/workspace/inventory-session/${draft.id}`).send({ revision: draft.revision, lines }).expect(200)).body;
  await prisma.product.delete({ where: { restaurantId_id: { restaurantId: restaurant.id, id: lines[0].productId } } });
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: restaurant.id, id: lines[1].productId } }, data: { unit: "pcs" } });
  const refreshed = (await agent.post(`/api/workspace/inventory-session/${draft.id}/refresh`).send({ revision: saved.revision }).expect(200)).body;
  expect(refreshed.lines.find((line: { productId: string }) => line.productId === lines[0].productId)).toMatchObject({ available: false, countedQuantity: null });
  expect(refreshed.lines.find((line: { productId: string }) => line.productId === lines[1].productId)).toMatchObject({ unit: "pcs", countedQuantity: null, previousCount: { quantity: 8, unit: "kg" } });
}, 15000);
it("autorise l’auteur, le chef ou le propriétaire à supprimer un brouillon partagé", async () => {
  const { agent, id } = await setup();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: id } });
  const kitchen = request.agent(app);
  const account = await kitchen.post("/api/auth/register").send({ displayName: "Cuisine", email: `${randomUUID()}@example.test`, password: "test password for inventory" }).expect(201);
  const kitchenId = account.body.user.id as string; users.push(kitchenId); kitchen.set("X-Expected-User-Id", kitchenId);
  await prisma.membership.create({ data: { userId: kitchenId, restaurantId: restaurant.id, role: "kitchen" } });
  const draft = (await agent.post("/api/workspace/inventory-session").expect(200)).body;
  await kitchen.post(`/api/workspace/inventory-session/${draft.id}/discard`).send({ revision: draft.revision }).expect(403);
  await prisma.membership.update({ where: { userId: kitchenId }, data: { role: "chef" } });
  await kitchen.post(`/api/workspace/inventory-session/${draft.id}/discard`).send({ revision: draft.revision }).expect(204);
  await prisma.membership.update({ where: { userId: kitchenId }, data: { role: "kitchen" } });
  const memberDraft = (await kitchen.post("/api/workspace/inventory-session").expect(200)).body;
  await prisma.membership.delete({ where: { userId: kitchenId } });
  await agent.post(`/api/workspace/inventory-session/${memberDraft.id}/discard`).send({ revision: memberDraft.revision }).expect(204);
});
