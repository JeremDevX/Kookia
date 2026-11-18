import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { app, createApp } from "./app.js";

const { restaurantId, token } = vi.hoisted(() => ({
  restaurantId: "fcb95406-85ab-4d26-a11f-2469c556366c", token: "workshop-test-token-".repeat(3),
}));

vi.mock("../config/env.js", async (importOriginal) => {
  const config = await importOriginal<typeof import("../config/env.js")>();
  return { ...config, env: { ...config.env, WORKSHOP_IMPORT_RESTAURANT_ID: restaurantId, WORKSHOP_IMPORT_TOKEN: token,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: undefined } };
});

const userIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function workspace(mode: "demo" | "operational", id: string = randomUUID()) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: "Atelier test", email: `workshop-${randomUUID()}@example.com`, password: "password for integration tests",
  }).expect(201);
  const ownerId: string = response.body.user.id;
  userIds.push(ownerId);
  agent.set("X-Expected-User-Id", ownerId);
  await prisma.restaurant.create({ data: {
    id, ownerId, mode, name: "Atelier", type: "Restaurant", address: "", city: "", phone: "", email: "", dailyCovers: 50,
  } });
  return agent;
}

it("imports an atomic and replayable simulated day into the configured demo workspace only", async () => {
  const owner = await workspace("operational", restaurantId);
  const otherOwner = await workspace("demo");
  const date = "2024-06-04";
  const url = (serviceDate: string) => `/api/integrations/workshop/days/${serviceDate}`;
  const send = (serviceDate: string) => request(app).put(url(serviceDate)).set("Authorization", `Bearer ${token}`);
  const sales = [{ name: "Soupe", quantity: 2 }, { name: "Tarte", quantity: 3 }];
  const day = { open: true, sales };
  const period = `from=${date}&to=${date}`;

  await owner.put(url(date)).send(day).expect(401);
  await request(app).put(url(date)).set("Authorization", "Bearer invalid").send(day).expect(401);
  expect((await send(date).send(day).expect(403)).body.error.code).toBe("DEMO_WORKSPACE_REQUIRED");
  expect((await owner.get(`/api/workspace/sales?${period}`).expect(200)).body).toEqual([]);
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { mode: "demo" } });

  await send("2024-02-31").send(day).expect(400);
  expect((await send("9999-12-31").send(day).expect(400)).body.error.code).toBe("FUTURE_SERVICE_DATE");
  await send(date).send({ ...day, restaurantId: randomUUID() }).expect(400);
  await send(date).send({ open: true, sales: [{ name: "Soupe", quantity: 0 }] }).expect(400);
  await send(date).send({ open: true, sales: [{ name: "Soupe", quantity: 2 }, { name: " soupe ", quantity: 1 }] }).expect(400);
  await send(date).send({ ...day, open: false }).expect(400);
  await send(date).set("Content-Type", "application/json").send("{invalid-json").expect(400);
  expect((await owner.get(`/api/workspace/sales/service-days?${period}`).expect(200)).body).toEqual([]);

  const existing = await owner.post("/api/workspace/sales/items").send({ name: "Soupe" }).expect(201);
  const outcomes = await Promise.all([send(date).send(day).expect(200), send(date).send({ open: true, sales: [...sales].reverse() }).expect(200)]);
  expect(outcomes.map(({ body }) => body.replayed).sort()).toEqual([false, true]);
  expect(outcomes.map(({ body }) => body.saleCount)).toEqual([2, 2]);
  expect((await send(date).send({ ...day, sales: [] }).expect(409)).body.error.code).toBe("WORKSHOP_DAY_CONFLICT");

  const recorded = (await owner.get(`/api/workspace/sales?${period}`).expect(200)).body;
  expect(recorded).toEqual([
    expect.objectContaining({ saleItemId: existing.body.id, saleItemName: "Soupe", quantity: 2, source: "demo_simulation" }),
    expect.objectContaining({ saleItemName: "Tarte", quantity: 3, source: "demo_simulation" }),
  ]);
  const serviceDays = (await owner.get(`/api/workspace/sales/service-days?${period}`).expect(200)).body;
  expect(serviceDays).toEqual([expect.objectContaining({ serviceDate: date, status: "open", coverage: "complete", source: "demo_simulation", salesCount: 2 })]);
  expect(await prisma.saleContribution.count({ where: { restaurantId, source: "demo_simulation", status: "accepted" } })).toBe(2);
  expect(await prisma.saleContributionEvent.count({ where: { restaurantId, kind: "accepted" } })).toBe(2);
  expect((await otherOwner.get(`/api/workspace/sales?${period}`).expect(200)).body).toEqual([]);

  const closedDate = "2024-06-05";
  const closed = { open: false, sales: [] };
  const firstClosed = await send(closedDate).send(closed).expect(200);
  expect(firstClosed.body).toEqual({ date: closedDate, saleCount: 0, replayed: false });
  expect((await send(closedDate).send(closed).expect(200)).body.replayed).toBe(true);

  const preexistingDate = "2024-06-06";
  await owner.put(`/api/workspace/sales/service-days/${preexistingDate}`).send({ expectedRevision: 0, status: "closed", coverage: "complete" }).expect(200);
  await send(preexistingDate).send(closed).expect(409);
  expect(await prisma.workspaceDocument.count({ where: { restaurantId, kind: { startsWith: "workshop-day:v1:" } } })).toBe(2);
});

it("admits only the opted-in operational test workspace and preserves its existing records and mode", async () => {
  const targetId = randomUUID();
  const otherId = randomUUID();
  const owner = await workspace("operational", targetId);
  const otherOwner = await workspace("operational", otherId);
  const legacyDate = "2024-06-07";
  const date = "2024-06-08";
  const item = await owner.post("/api/workspace/sales/items").send({ name: "Tarte" }).expect(201);
  const legacy = await owner.post("/api/workspace/sales").send({
    operationId: randomUUID(), saleItemId: item.body.id, serviceDate: legacyDate, quantity: 5,
  }).expect(201);

  env.WORKSHOP_IMPORT_RESTAURANT_ID = targetId;
  env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = "true";
  const optedInApp = (() => {
    try { return createApp(); }
    finally {
      env.WORKSHOP_IMPORT_RESTAURANT_ID = restaurantId;
      env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = undefined;
    }
  })();
  const send = (serviceDate: string) => request(optedInApp).put(`/api/integrations/workshop/days/${serviceDate}`)
    .set("Authorization", `Bearer ${token}`);
  const day = { open: true, sales: [{ name: "Tarte", quantity: 9 }] };
  await send(legacyDate).send(day).expect(409);
  await send(date).query({ restaurantId: otherId }).send(day).expect(200, { date, replayed: false, saleCount: 1 });
  await send(date).send(day).expect(200, { date, replayed: true, saleCount: 1 });

  const period = `from=${legacyDate}&to=${date}`;
  const salesPath = `/api/workspace/sales?${period}`;
  expect((await owner.get(salesPath).expect(200)).body).toEqual([
    expect.objectContaining({ saleItemId: item.body.id, serviceDate: date, quantity: 9, source: "demo_simulation" }),
    legacy.body,
  ]);
  expect((await otherOwner.get(salesPath).expect(200)).body).toEqual([]);
  expect(await prisma.restaurant.findUnique({ where: { id: targetId }, select: { mode: true } })).toEqual({ mode: "operational" });
});
