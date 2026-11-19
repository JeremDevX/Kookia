import { createHash, randomUUID } from "node:crypto";
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

function workshopAppFor(targetId?: string) {
  env.WORKSHOP_IMPORT_TOKEN = targetId ? token : undefined;
  env.WORKSHOP_IMPORT_RESTAURANT_ID = targetId;
  env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = targetId ? "true" : undefined;
  try { return createApp(); }
  finally {
    env.WORKSHOP_IMPORT_TOKEN = token;
    env.WORKSHOP_IMPORT_RESTAURANT_ID = restaurantId;
    env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = undefined;
  }
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

  const optedInApp = workshopAppFor(targetId);
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

it("reconciles dated stock lots on a sales-only replay and rolls back a new day when stock differs", async () => {
  const targetId = randomUUID();
  const owner = await workspace("operational", targetId);
  const optedInApp = workshopAppFor(targetId);
  const date = "2024-06-08", nextDate = "2024-06-09";
  const send = (serviceDate: string) => request(optedInApp).put(`/api/integrations/workshop/days/${serviceDate}`)
    .set("Authorization", `Bearer ${token}`);
  const productId = "pears";
  await prisma.supplier.create({ data: { id: "orchard", restaurantId: targetId, name: "Verger", email: "", phone: "" } });
  await prisma.product.create({ data: { id: productId, restaurantId: targetId, supplierId: "orchard", name: "Poires",
    unit: "kg", category: "Fruits", currentStock: 2, minThreshold: 1, pricePerUnit: 3.3 } });
  const legacyLot = await prisma.stockLot.create({ data: { restaurantId: targetId, productId, actorId: "fixture",
    source: "receipt", receivedAt: new Date("2024-06-05"), expiresAt: new Date(date), quantityReceived: 3, remainingQuantity: 2, unitCost: 2.99 } });

  const day = { open: true, sales: [{ name: "Tarte", quantity: 9 }] };
  const part = { reference: "remaining-pears", receivedOn: "2024-06-05", expiresOn: date, unitCostCents: 315,
    openingMilli: 2000, addedMilli: 0, closingMilli: 500, lossMilli: 100, addition: null };
  const delivery = { reference: "new-pears", receivedOn: date, expiresOn: "2024-06-20", unitCostCents: 350,
    openingMilli: 0, addedMilli: 1000, closingMilli: 700, lossMilli: 100, addition: "delivery" };
  const stock = { name: "Poires", unit: "kg", lots: [part, delivery] };
  const currentStock = async () => (await owner.get("/api/workspace/catalog").expect(200)).body.products[0].currentStock;

  await request(workshopAppFor()).put(`/api/integrations/workshop/days/${date}`)
    .set("Authorization", `Bearer ${token}`).send({ ...day, stock: [stock] }).expect(404);
  await request(workshopAppFor(randomUUID())).put(`/api/integrations/workshop/days/${date}`)
    .set("Authorization", `Bearer ${token}`).send({ ...day, stock: [stock] }).expect(404);
  await send(date).send(day).expect(200, { date, replayed: false, saleCount: 1 });
  await send(date).send({ ...day, stock: [{ ...stock, lots: [{ ...part, receivedOn: date }, delivery] }] }).expect(400);
  await send(date).send({ ...day, stock: [{ ...stock, lots: [part, part] }] }).expect(400);
  await send(date).send({ ...day, stock: [{ ...stock, unit: "pcs" }] }).expect(400);
  await send(date).send({ ...day, stock: [{ ...stock, lots: [{ ...part, openingMilli: 2500 }, delivery] }] }).expect(409);
  expect(await currentStock()).toBe(2);
  const acknowledged = { date, replayed: true, saleCount: 1, stockApplied: true };
  await send(date).send({ ...day, stock: [stock] }).expect(200, acknowledged);
  expect(await currentStock()).toBe(1.2);

  const lots = (await owner.get(`/api/workspace/products/${productId}/lots`).expect(200)).body;
  expect(lots.unagedStock).toEqual([]);
  expect(lots.lots).toEqual([
    expect.objectContaining({ id: legacyLot.id, source: "receipt", remainingQuantity: 0.5, unitCost: 2.99 }),
    expect.objectContaining({ source: "demo_simulation", receivedAt: date, expiresAt: delivery.expiresOn,
      remainingQuantity: 0.7, quantityReceived: 1, unitCost: 3.5, purchaseReceiptLineId: null }),
  ]);
  const movementPath = `/api/workspace/products/${productId}/movements`;
  const movements = (await owner.get(movementPath).expect(200)).body;
  expect(movements.map((row: { delta: number }) => row.delta).sort((a: number, b: number) => a - b)).toEqual([-1.4, -0.2, -0.1, -0.1, 1]);
  await send(date).send({ ...day, stock: [{ ...stock, lots: [...stock.lots].reverse() }] }).expect(200, acknowledged);
  const stockDocumentWhere = { restaurantId_kind: { restaurantId: targetId, kind: `workshop-stock:v1:${date}` } };
  const originalDigest = createHash("sha256").update(JSON.stringify([{ ...stock, lots: [delivery, part] }])).digest("hex");
  const enriched = { ...stock, lots: [{ adjustmentOutMilli: 140, ...part }, { ...delivery, adjustmentOutMilli: 0 }] };
  await send(date).send({ ...day, stock: [enriched] }).expect(200, acknowledged);
  const changedLegacy = { ...enriched, lots: [{ ...enriched.lots[0], closingMilli: 600 }, enriched.lots[1]] };
  expect((await send(date).send({ ...day, stock: [changedLegacy] }).expect(409)).body.error.code).toBe("WORKSHOP_STOCK_CHANGED");
  expect(await prisma.workspaceDocument.findUnique({ where: stockDocumentWhere, select: { data: true } })).toEqual({ data: originalDigest });
  const unchangedMovements = (await owner.get(movementPath).expect(200)).body;
  expect(unchangedMovements).toHaveLength(movements.length);
  expect(unchangedMovements).toEqual(expect.arrayContaining(movements));
  expect(await prisma.purchaseReceipt.count({ where: { restaurantId: targetId } })).toBe(0);

  const expired = { ...part, openingMilli: 500, closingMilli: 0, lossMilli: 500, adjustmentOutMilli: 0 };
  const remaining = { ...delivery, openingMilli: 700, addedMilli: 0, closingMilli: 400, lossMilli: 0, addition: null };
  const counted = { ...remaining, adjustmentOutMilli: 60 };
  const nextDelivery = { ...delivery, reference: "second-delivery", receivedOn: nextDate, expiresOn: "2024-06-19",
    addedMilli: 300, closingMilli: 200, lossMilli: 0 };
  const nextStock = { ...stock, lots: [expired, counted, { ...nextDelivery, adjustmentOutMilli: 0 }] };
  await send(nextDate).send({ ...day, stock: [{ ...stock, lots: [{ ...expired, closingMilli: 1, lossMilli: 499 }, remaining] }] }).expect(400);
  await send(nextDate).send({ ...day, stock: [{ ...nextStock, lots: [{ ...expired, adjustmentOutMilli: 1 }] }] }).expect(400);
  await send(nextDate).send({ ...day, stock: [{ ...stock, unit: "pcs", lots: [
    { ...counted, openingMilli: 2000, closingMilli: 1000 },
  ] }] }).expect(400);
  await send(nextDate).send({ ...day, stock: [{ ...stock, lots: [expired, { ...remaining, openingMilli: 800 }] }] }).expect(409);
  const nextPeriod = `from=${nextDate}&to=${nextDate}`;
  expect((await owner.get(`/api/workspace/sales?${nextPeriod}`).expect(200)).body).toEqual([]);
  expect((await owner.get(`/api/workspace/sales/service-days?${nextPeriod}`).expect(200)).body).toEqual([]);
  expect(await currentStock()).toBe(1.2);
  await send(nextDate).send({ ...day, stock: [nextStock] })
    .expect(200, { date: nextDate, replayed: false, saleCount: 1, stockApplied: true });
  await send(nextDate).send({ ...day, stock: [nextStock] })
    .expect(200, { ...acknowledged, date: nextDate });
  await send(nextDate).send({ ...day, stock: [{ ...nextStock, lots: [expired, counted, nextDelivery] }] })
    .expect(200, { ...acknowledged, date: nextDate });
  const differentSplit = { ...nextStock, lots: [expired, { ...counted, adjustmentOutMilli: 70 }, nextStock.lots[2]] };
  expect((await send(nextDate).send({ ...day, stock: [differentSplit] }).expect(409)).body.error.code).toBe("WORKSHOP_STOCK_CHANGED");
  const legacyNext = { ...stock, lots: [{ ...part, openingMilli: 500, closingMilli: 0, lossMilli: 500 }, remaining, nextDelivery] };
  expect((await send(nextDate).send({ ...day, stock: [legacyNext] }).expect(409)).body.error.code).toBe("WORKSHOP_STOCK_CHANGED");

  const expectedLotId = lots.lots[1].id;
  const movementsAfterCount = await prisma.stockMovement.findMany({ where: { restaurantId: targetId,
    operationId: { startsWith: `workshop-stock:v1:${nextDate}:${remaining.reference}:` } },
  select: { reason: true, delta: true, lotAllocations: { select: { lotId: true, quantity: true } } }, orderBy: { reason: "asc" } });
  expect(movementsAfterCount.map(({ reason, delta, lotAllocations }) => ({ reason, delta: Number(delta),
    lots: lotAllocations.map(allocation => ({ lotId: allocation.lotId, quantity: Number(allocation.quantity) })) }))).toEqual([
    { reason: "simulated_consumption", delta: -0.24, lots: [{ lotId: expectedLotId, quantity: 0.24 }] },
    { reason: "simulation_stock_adjustment", delta: -0.06, lots: [{ lotId: expectedLotId, quantity: 0.06 }] },
  ]);
  expect(await prisma.stockCount.count({ where: { restaurantId: targetId } })).toBe(0);
  expect(await currentStock()).toBe(0.6);
});
