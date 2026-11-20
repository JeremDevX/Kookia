import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";
import { addCalendarDays } from "../../../shared/calendarDate.js";
import { formatParisDate } from "../../../shared/parisDate.js";
import { workshopControlSchema, workshopRunnerControlSchema, type WorkshopRunEvent } from "../../../shared/workshopControl.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createApp } from "./app.js";

const token = "workshop-control-test-token-".repeat(2);
const panel = "/api/workspace/workshop";
const integration = "/api/integrations/workshop";
const userIds: string[] = [];
let client = 0;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

function workshopApp(restaurantId: string, allowOperationalTestWorkspace = false) {
  const previous = {
    WORKSHOP_IMPORT_TOKEN: env.WORKSHOP_IMPORT_TOKEN, WORKSHOP_IMPORT_RESTAURANT_ID: env.WORKSHOP_IMPORT_RESTAURANT_ID,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE,
    WORKSHOP_SCHEDULE_TIME: env.WORKSHOP_SCHEDULE_TIME, WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM: env.WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM,
  };
  Object.assign(env, { WORKSHOP_IMPORT_TOKEN: token, WORKSHOP_IMPORT_RESTAURANT_ID: restaurantId,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: allowOperationalTestWorkspace ? "true" : undefined,
    WORKSHOP_SCHEDULE_TIME: "03:00", WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM: undefined });
  try { return createApp().set("trust proxy", true); }
  finally { Object.assign(env, previous); }
}

async function connect(app: ReturnType<typeof createApp>) {
  const agent = request.agent(app).set("X-Forwarded-For", `10.2.0.${++client}`);
  const response = await agent.post("/api/auth/register").send({ displayName: "Atelier",
    email: `workshop-control-${randomUUID()}@example.com`, password: "password for integration tests" }).expect(201);
  const id: string = response.body.user.id;
  userIds.push(id);
  agent.set("X-Expected-User-Id", id);
  return { agent, id };
}

async function createRestaurant(id: string, ownerId: string, mode: "demo" | "operational" = "demo") {
  await prisma.restaurant.create({ data: {
    id, ownerId, mode, name: "Maison Sureau", type: "Restaurant", address: "", city: "Paris", phone: "", email: "", dailyCovers: 50,
  } });
}

it("isolates the control panel by session, restaurant, role and explicit operational opt-in", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId);
  const [owner, chef, kitchen, other] = await Promise.all([connect(app), connect(app), connect(app), connect(app)]);
  await Promise.all([
    createRestaurant(restaurantId, owner.id),
    createRestaurant(randomUUID(), other.id),
  ]);
  await prisma.membership.createMany({ data: [
    { restaurantId, userId: chef.id, role: "chef" }, { restaurantId, userId: kitchen.id, role: "kitchen" },
  ] });

  await request(app).get(panel).expect(401);
  await owner.agent.get(panel).set("X-Expected-User-Id", chef.id).expect(409);
  await other.agent.get(panel).expect(404);
  await kitchen.agent.get(panel).expect(403);
  const overview = workshopControlSchema.parse((await chef.agent.get(panel).expect(200)
    .expect("Cache-Control", "private, no-store")).body);
  expect(overview.canManage).toBe(false);
  expect(overview.restaurant.name).toBe("Maison Sureau");
  expect(overview.transfer.nextRun?.time).toBe("03:00");
  await chef.agent.put(`${panel}/settings`).send({ covers: 45, incidentEvery: 5, expectedRevision: 0 }).expect(403);
  await chef.agent.post(`${panel}/retry`).send({}).expect(403);
  await request(app).get(`${integration}/control`).expect(401);
  await other.agent.get(`${panel}/days/2024-06-17`).expect(404);
  await chef.agent.get(`${panel}/days/2024-02-30`).expect(400);
  await chef.agent.get(`${panel}/days/2024-06-17`).expect(404);

  await prisma.restaurant.update({ where: { id: restaurantId }, data: { mode: "operational" } });
  await owner.agent.get(panel).expect(404);
  await request(app).get(`${integration}/control`).auth(token, { type: "bearer" }).expect(404);
  await request(workshopApp(restaurantId, true)).get(`${integration}/control`).auth(token, { type: "bearer" }).expect(200);
});

it("versions settings and applies changes to future days", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId);
  const { agent, id } = await connect(app);
  await createRestaurant(restaurantId, id);
  const tomorrow = addCalendarDays(formatParisDate(), 1);
  const input = { covers: 50, incidentEvery: 3, expectedRevision: 0 };
  const save = () => agent.put(`${panel}/settings`).send(input);

  const results = await Promise.all([save(), save()]);
  expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
  const firstVersion = { covers: 50, incidentEvery: 3, effectiveFrom: tomorrow, revision: 1 };
  expect(results.find(({ status }) => status === 200)?.body).toEqual(firstVersion);
  const runnerPath = `${integration}/control`;
  const runner = workshopRunnerControlSchema.parse((await request(app).get(runnerPath).auth(token, { type: "bearer" }).expect(200)).body);
  expect(runner.settings).toEqual([firstVersion]);
  await agent.put(`${panel}/settings`).send({ ...input, covers: 201, expectedRevision: 1 }).expect(400);

  vi.setSystemTime(new Date(`${tomorrow}T12:00:00.000Z`));
  try {
    const second = { covers: 55, incidentEvery: 2, effectiveFrom: addCalendarDays(tomorrow, 1), revision: 2 };
    await agent.put(`${panel}/settings`).send({ covers: 55, incidentEvery: 2, expectedRevision: 1 }).expect(200, second);
    const control = workshopRunnerControlSchema.parse((await request(app).get(runnerPath).auth(token, { type: "bearer" }).expect(200)).body);
    expect(control.settings).toEqual([firstVersion, second]);
  } finally { vi.useRealTimers(); }
});

it("claims one run at a time and queues an interrupted transfer without fabricating imported evidence", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId);
  const { agent, id } = await connect(app);
  await createRestaurant(restaurantId, id);
  const yesterday = addCalendarDays(formatParisDate(), -1);
  const running: WorkshopRunEvent = { id: randomUUID(), state: "running", date: yesterday, step: "import", issue: null };
  const publish = (event: WorkshopRunEvent) => request(app).put(`${integration}/run`).auth(token, { type: "bearer" }).send(event);
  const retry = () => agent.post(`${panel}/retry`).send({});
  const overview = async () => workshopControlSchema.parse((await agent.get(panel).expect(200)).body);

  await retry().expect(409);
  const competing = { ...running, id: randomUUID() };
  const results = await Promise.all([publish(running), publish(competing)]);
  expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
  const active = results[0].status === 200 ? running : competing;
  await retry().expect(409);

  vi.setSystemTime(new Date(Date.now() + 31 * 60_000));
  try {
    expect((await overview()).transfer).toMatchObject({ canRetry: true, lastConfirmedDate: null,
      lastRun: { id: active.id, state: "failed", issue: { code: "INTERRUPTED" } } });
    await Promise.all([retry().expect(202, { queued: true }), retry().expect(202, { queued: true })]);
    expect((await overview()).transfer).toMatchObject({ retryRequested: true, canRetry: false });
    const replacement = { ...running, id: randomUUID() };
    await publish(replacement).expect(200, { ok: true });
    await publish({ ...active, state: "succeeded" }).expect(409);
    await request(app).put(`${integration}/days/${yesterday}`).auth(token, { type: "bearer" })
      .send({ open: false, sales: [] }).expect(200);
    const completed = { ...replacement, state: "succeeded" as const };
    await publish(completed).expect(200);
    await publish(completed).expect(200);

    const result = await overview();
    expect(result.transfer).toMatchObject({ retryRequested: false, canRetry: false, lastConfirmedDate: yesterday,
      lastRun: { id: replacement.id, state: "succeeded", finishedAt: expect.any(String) } });
    expect(result.history).toEqual([{ date: yesterday, confirmedAt: result.transfer.lastConfirmedAt, stock: false, operations: false }]);
    await agent.get(`${panel}/days/${yesterday}`).expect(200);
  } finally { vi.useRealTimers(); }
});

it("flags a missed scheduled transfer after the grace period without replacing the last reported run", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId);
  const { agent, id } = await connect(app);
  await createRestaurant(restaurantId, id);
  const publish = (event: WorkshopRunEvent) => request(app).put(`${integration}/run`).auth(token, { type: "bearer" }).send(event);
  const transfer = async () => workshopControlSchema.parse((await agent.get(panel).expect(200)).body).transfer;
  const date = "2026-01-01";
  const run: WorkshopRunEvent = { id: randomUUID(), state: "running", date, step: "import", issue: null };
  vi.setSystemTime(new Date("2026-01-02T02:01:00.000Z"));
  try {
    await publish(run).expect(200);
    await request(app).put(`${integration}/days/${date}`).auth(token, { type: "bearer" })
      .send({ open: false, sales: [] }).expect(200);
    await publish({ ...run, state: "succeeded" }).expect(200);
    vi.setSystemTime(new Date("2026-01-03T02:29:00.000Z"));
    expect(await transfer()).toMatchObject({ missedDate: null, canRetry: false });
    await agent.post(`${panel}/retry`).send({}).expect(409);

    vi.setSystemTime(new Date("2026-01-03T02:30:00.000Z"));
    expect(await transfer()).toMatchObject({ missedDate: "2026-01-02", canRetry: true,
      lastConfirmedDate: date, lastRun: { id: run.id, state: "succeeded" } });
    await agent.post(`${panel}/retry`).send({}).expect(202, { queued: true });
    expect(await transfer()).toMatchObject({ missedDate: "2026-01-02", canRetry: false, retryRequested: true });
  } finally { vi.useRealTimers(); }
});

it("queues the first missed transfer when a legacy closure exists and no run was reported", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId);
  const { agent, id } = await connect(app);
  await createRestaurant(restaurantId, id);

  const day = addCalendarDays(formatParisDate(), -3);
  await request(app).put(`${integration}/days/${day}`).auth(token, { type: "bearer" })
    .send({ open: false, sales: [] }).expect(200);
  await agent.post(`${panel}/retry`).send({}).expect(202, { queued: true });
  const control = workshopControlSchema.parse((await agent.get(panel).expect(200)).body);
  expect(control.transfer).toMatchObject({
    lastRun: null, lastConfirmedDate: day, missedDate: addCalendarDays(day, 1), retryRequested: true, canRetry: false,
  });
  const runner = workshopRunnerControlSchema.parse((await request(app).get(`${integration}/control`).auth(token, { type: "bearer" }).expect(200)).body);
  expect(runner.retryRequested).toBe(true);
});

it("reads validated operational orders without enabling the workshop delivery loop", async () => {
  const restaurantId = randomUUID();
  const app = workshopApp(restaurantId, true);
  const { agent, id: ownerId } = await connect(app);
  await createRestaurant(restaurantId, ownerId, "operational");
  const line = { productId: "pears", productName: "Poires", supplierId: "orchard", supplierName: "Verger",
    quantity: 3, unit: "kg", pricePerUnit: 2 };
  const nextDate = addCalendarDays(formatParisDate(), 1);
  const order = await prisma.purchaseOrder.create({ data: { restaurantId, actorId: ownerId,
    operationId: randomUUID(), status: "validated",
    lines: { create: [{ ...line, expectedDeliveryDate: new Date(nextDate) }] },
  }, include: { lines: true } });
  await prisma.purchaseOrder.create({ data: { restaurantId, actorId: ownerId,
    operationId: randomUUID(), status: "simulated", lines: { create: [{ ...line, productName: "Prunes" }] },
  } });

  const control = workshopControlSchema.parse((await agent.get(panel).expect(200)).body);
  expect(control.purchases).toEqual({ followValidated: false, suggestions: [], receipts: [], orders: [{
    id: order.lines[0].id, orderId: order.id, name: line.productName, supplier: line.supplierName,
    ordered: 3, remaining: 3, unit: line.unit, expectedDate: nextDate,
  }] });
});
