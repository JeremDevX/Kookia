import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";
import { addCalendarDays } from "../../../shared/calendarDate.js";
import { formatParisDate } from "../../../shared/parisDate.js";
import type { WorkshopForecast } from "../../../shared/workshopForecast.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { app, createApp } from "./app.js";

const { targetId, token } = vi.hoisted(() => ({
  targetId: "2f65d506-c71b-4cb4-b371-24de623b5a89", token: "forecast-fixture-token-".repeat(3),
}));

vi.mock("../config/env.js", async (importOriginal) => {
  const config = await importOriginal<typeof import("../config/env.js")>();
  return { ...config, env: { ...config.env, WORKSHOP_IMPORT_RESTAURANT_ID: targetId, WORKSHOP_IMPORT_TOKEN: token,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: undefined, WORKSHOP_FORECAST_ENABLED: "true" } };
});

const userIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function account() {
  const agent = request.agent(app);
  const { body } = await agent.post("/api/auth/register").send({
    displayName: "Forecast fixture", email: `forecast-${randomUUID()}@example.com`, password: "isolated fixture password",
  }).expect(201);
  const userId: string = body.user.id;
  userIds.push(userId);
  agent.set("X-Expected-User-Id", userId);
  return { agent, userId };
}

async function fixtureRestaurant(id: string, ownerId: string) {
  await prisma.restaurant.create({ data: {
    id, ownerId, mode: "demo", name: "Atelier", type: "Restaurant", address: "", city: "", phone: "", email: "", dailyCovers: 40,
  } });
}

it("publishes only a current forecast for the authorized test restaurant and owner", async () => {
  const owner = await account(), other = await account(), member = await account();
  const otherRestaurantId = randomUUID();
  await fixtureRestaurant(targetId, owner.userId);
  await fixtureRestaurant(otherRestaurantId, other.userId);
  await prisma.membership.create({ data: { userId: member.userId, restaurantId: targetId, role: "chef" } });
  const date = formatParisDate(), basedOnDate = addCalendarDays(date, -1);
  const readPath = "/api/workspace/dashboard/forecast";
  const writePath = `/api/integrations/workshop/forecast/${date}`;
  const valid: WorkshopForecast = {
    provenance: "demo_simulation", date, basedOnDate, covers: 24, revenueCents: 46_320,
    hours: [{ hour: 12, covers: 16 }, { hour: 13, covers: 8 }],
    products: [{ name: "Poires", supplier: "Verger", unit: "kg", quantityMilli: 2500, deliveryDate: date }],
  };
  const send = () => request(app).put(writePath).set("Authorization", `Bearer ${token}`);
  await request(app).get(readPath).expect(401);
  await member.agent.get(readPath).expect(403);
  await owner.agent.get(readPath).expect(200, { forecast: null });
  await owner.agent.put(writePath).send(valid).expect(401);
  await request(app).put(writePath).set("Authorization", "Bearer invalid").send(valid).expect(401);
  await send().send({ ...valid, restaurantId: otherRestaurantId }).expect(400);
  await send().send({ ...valid, covers: 23 }).expect(400);
  await send().send({ ...valid, hours: [{ hour: 12, covers: 16 }, { hour: 12, covers: 8 }] }).expect(400);
  await send().send({ ...valid, products: [{ ...valid.products[0], quantityMilli: 0 }] }).expect(400);
  await send().send({ ...valid, products: [{ ...valid.products[0], deliveryDate: basedOnDate }] }).expect(400);
  await send().send({ ...valid, basedOnDate: addCalendarDays(basedOnDate, -1) }).expect(400);
  const missing = await send().send(valid).expect(409);
  expect(missing.body.error.code).toBe("WORKSHOP_FORECAST_BASE_MISSING");

  const stale = { ...valid, date: basedOnDate, basedOnDate: addCalendarDays(basedOnDate, -1) };
  const kind = "workshop-forecast:v1";
  await prisma.workspaceDocument.createMany({ data: [
    { restaurantId: targetId, kind, data: stale }, { restaurantId: otherRestaurantId, kind, data: valid },
  ] });
  await owner.agent.get(readPath).expect(200, { forecast: null });
  await other.agent.get(readPath).expect(200, { forecast: null });
  const wrongDay = await request(app).put(`/api/integrations/workshop/forecast/${basedOnDate}`)
    .set("Authorization", `Bearer ${token}`).send(stale).expect(400);
  expect(wrongDay.body.error.code).toBe("WORKSHOP_FORECAST_DATE");

  await request(app).put(`/api/integrations/workshop/days/${basedOnDate}`).set("Authorization", `Bearer ${token}`)
    .send({ open: false, sales: [] }).expect(200);
  await send().query({ restaurantId: otherRestaurantId }).send(valid).expect(200, { date });
  await send().send(valid).expect(200, { date });
  await owner.agent.get(readPath).expect("Cache-Control", "private, no-store").expect(200, { forecast: valid });
  await other.agent.get(readPath).expect(200, { forecast: null });
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: targetId, kind } })).toBe(1);
  expect(await prisma.purchaseOrder.count({ where: { restaurantId: targetId } })).toBe(0);
  expect(await prisma.stockMovement.count({ where: { restaurantId: targetId } })).toBe(0);

  await prisma.restaurant.update({ where: { id: targetId }, data: { mode: "operational" } });
  await owner.agent.get(readPath).expect(200, { forecast: null });
  await send().send(valid).expect(403);
  try {
    env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = "true";
    const optedIn = createApp();
    await request(optedIn).put(writePath).set("Authorization", `Bearer ${token}`).send(valid).expect(200, { date });
    await owner.agent.get(readPath).expect(200, { forecast: valid });
    env.WORKSHOP_FORECAST_ENABLED = undefined;
    const disabled = createApp();
    await request(disabled).put(writePath).set("Authorization", `Bearer ${token}`).send(valid).expect(404);
    await owner.agent.get(readPath).expect(200, { forecast: null });
  } finally {
    env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE = undefined;
    env.WORKSHOP_FORECAST_ENABLED = "true";
  }
});
