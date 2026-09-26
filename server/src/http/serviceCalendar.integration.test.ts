import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Service calendar test",
    email: `service-calendar-${randomUUID()}@example.com`, password: "isolated calendar test password" }).expect(201);
  users.push(result.body.user.id); return agent;
}

it("keeps opening plans separate from reviewed observations and enforces ownership/revisions", async () => {
  const owner = await account(), other = await account();
  await request(app).get("/api/workspace/services/weekly").expect(401);
  const weekly = { weekday: 1, slot: "lunch", opensAt: "12:00", closesAt: "14:00", open: true, expectedRevision: 0 };
  await owner.put("/api/workspace/services/weekly").send(weekly).expect(200);
  await owner.put("/api/workspace/services/weekly").send(weekly).expect(409);
  expect((await other.get("/api/workspace/services/weekly").expect(200)).body).toEqual([]);
  const period = { from: "2026-09-21", to: "2026-09-21" };
  const planned = (await owner.get("/api/workspace/services/calendar").query(period).expect(200)).body;
  expect(planned).toContainEqual(expect.objectContaining({ slot: "lunch", plannedOpen: true, coverage: "missing", actualCovers: null }));
  const session = { serviceDate: period.from, slot: "lunch", plannedOpen: false, coverage: "missing", actualCovers: null, note: "Fermeture exceptionnelle", expectedRevision: 0 };
  await owner.put("/api/workspace/services/calendar").send(session).expect(200);
  await owner.put("/api/workspace/services/calendar").send(session).expect(409);
  await owner.put("/api/workspace/services/calendar").send({ ...session, expectedRevision: 1, coverage: "complete", actualCovers: 1 }).expect(409);
  expect((await owner.get("/api/workspace/services/calendar").query(period).expect(200)).body)
    .toContainEqual(expect.objectContaining({ slot: "lunch", plannedOpen: false, coverage: "missing", exceptional: true }));
  await owner.put("/api/workspace/services/calendar").send({ ...session, serviceDate: "2099-01-01", coverage: "complete" }).expect(400);
});

it("ventilates only confirmed quantities, preserves unknown remainder, invalidates after correction", async () => {
  const owner = await account(), other = await account();
  const item = (await owner.post("/api/workspace/sales/items").send({ name: "Plat service test" }).expect(201)).body;
  const input = { saleItemId: item.id, serviceDate: "2026-09-21", quantity: 12 };
  const sale = (await owner.post("/api/workspace/sales").send({ ...input, operationId: randomUUID() }).expect(201)).body;
  expect((await owner.get(`/api/workspace/sales/${sale.id}/services`).expect(200)).body)
    .toMatchObject({ lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 12, needsReview: false });
  const allocation = { lunchQuantity: 5, dinnerQuantity: 4, expectedRevision: 0, expectedSaleRevision: 0 };
  await other.put(`/api/workspace/sales/${sale.id}/services`).send(allocation).expect(404);
  await owner.put(`/api/workspace/sales/${sale.id}/services`).send({ ...allocation, lunchQuantity: 9 }).expect(400);
  await owner.put(`/api/workspace/sales/${sale.id}/services`).send(allocation).expect(200);
  await owner.put(`/api/workspace/sales/${sale.id}/services`).send(allocation).expect(409);
  const query = { from: input.serviceDate, to: input.serviceDate };
  expect((await owner.get("/api/workspace/services/calendar").query(query).expect(200)).body)
    .toContainEqual(expect.objectContaining({ slot: "lunch", soldQuantity: 5, unallocatedQuantity: 3 }));
  await owner.put("/api/workspace/services/calendar").send({ serviceDate: input.serviceDate, slot: "lunch", plannedOpen: false,
    coverage: "complete", actualCovers: 0, note: "Fermeture contradictoire", expectedRevision: 0 }).expect(409);
  await owner.put("/api/workspace/services/calendar").send({ serviceDate: input.serviceDate, slot: "dinner", plannedOpen: false,
    coverage: "complete", actualCovers: 0, note: "Fermeture contradictoire", expectedRevision: 0 }).expect(409);
  await owner.put("/api/workspace/services/calendar").send({ serviceDate: input.serviceDate, slot: "lunch", plannedOpen: true,
    coverage: "complete", actualCovers: 9, note: "Revue", expectedRevision: 0 }).expect(200);
  await owner.patch(`/api/workspace/sales/${sale.id}`).send({ ...input, quantity: 15, revision: 0,
    operationId: randomUUID(), reason: "Correction isolée" }).expect(200);
  expect((await owner.get(`/api/workspace/sales/${sale.id}/services`).expect(200)).body)
    .toMatchObject({ lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 15, needsReview: true });
  expect((await owner.get("/api/workspace/services/calendar").query(query).expect(200)).body)
    .toContainEqual(expect.objectContaining({ slot: "lunch", soldQuantity: 0, coverage: "partial", allocationNeedsReview: true }));
});
