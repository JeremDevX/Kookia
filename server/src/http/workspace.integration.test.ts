import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: "Catalog test", email: `catalog-${randomUUID()}@example.com`, password: "catalog integration password",
  }).expect(201);
  ids.push(response.body.user.id);
  return agent;
}

describe("persistent catalog HTTP", () => {
  it("authenticates, validates, persists, isolates and prevents overspending stock", async () => {
    await request(app).get("/api/workspace/catalog").expect(401);
    const first = await account();
    const second = await account();
    const initial = await first.get("/api/workspace/catalog").expect(200);
    const product = initial.body.products[0];
    const created = await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Test product", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1.25, supplierId: product.supplierId,
    }).expect(201);
    const id = created.body.id;
    const operationId = randomUUID();
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    const repeated = await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: -2.5 }).expect(200);
    expect(repeated.body.currentStock).toBe(7.5);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId, delta: 4 }).expect(409);
    await second.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: 1 }).expect(404);
    await first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: "bad" }).expect(400);
    const concurrent = await Promise.all([1, 2].map(() => first.post(`/api/workspace/products/${id}/stock`).send({ operationId: randomUUID(), delta: -5 })));
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    const refreshed = await first.get("/api/workspace/catalog").expect(200);
    expect(refreshed.body.products.find((item: { id: string }) => item.id === id).currentStock).toBe(2.5);
    const history = await first.get(`/api/workspace/products/${id}/movements`).expect(200);
    expect(history.body).toHaveLength(3);
    const foreign = await second.get("/api/workspace/catalog").expect(200);
    expect(foreign.body.products.some((item: { id: string }) => item.id === id)).toBe(false);
    await first.post("/api/workspace/products").send({
      operationId: randomUUID(), name: "Invalid", category: "Légumes", currentStock: 10,
      unit: "kg", minThreshold: 2, pricePerUnit: 1, supplierId: randomUUID(),
    }).expect(400);
  });
});
