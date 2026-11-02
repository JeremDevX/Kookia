import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });

it("rejects stale or missing workspace identity before any workspace access", async () => {
  await request(app).get("/api/workspace/catalog").expect(401);
  const first = request.agent(app), second = request.agent(app);
  for (const agent of [first, second]) {
    const registered = await agent.post("/api/auth/register").send({ displayName: "Test", email: `session-${randomUUID()}@example.com`, password: "test session password" }).expect(201);
    ids.push(registered.body.user.id);
    expect((await agent.get("/api/workspace/catalog").expect(409)).body.error.code).toBe("SESSION_CHANGED");
    expect((await agent.get("/api/workspace/catalog").set("X-Expected-User-Id", registered.body.user.id).expect(409)).body.error.code).toBe("SETUP_REQUIRED");
    await agent.post("/api/setup").send({ expectedUserId: registered.body.user.id, name: "Test", type: "Restaurant", address: "", city: "Test", phone: "", email: "test@example.com", dailyCovers: 0 }).expect(201);
  }
  const header = "X-Expected-User-Id";
  for (const value of [undefined, "invalid", ids[0]]) {
    const call = second.get("/api/workspace/restaurant");
    if (value !== undefined) call.set(header, value);
    expect((await call.expect(409)).body.error.code).toBe("SESSION_CHANGED");
  }
  const supplier = { id: randomUUID(), name: "Test", email: "supplier@example.com", phone: "" };
  for (const call of [
    second.post("/api/workspace/suppliers").send(supplier),
    second.put("/api/workspace/services/weekly").send({ weekday: 1, slot: "lunch", opensAt: "12:00", closesAt: "14:00", open: true, expectedRevision: 0 }),
    second.patch("/api/workspace/restaurant").send({}),
    second.delete(`/api/workspace/sales/tickets/${randomUUID()}`),
  ]) expect((await call.set(header, ids[0]).expect(409)).body.error.code).toBe("SESSION_CHANGED");
  expect((await second.get("/api/workspace/catalog").set(header, ids[1]).expect(200)).body).toEqual({ products: [], suppliers: [] });
  expect((await second.get("/api/workspace/services/weekly").set(header, ids[1]).expect(200)).body).toEqual([]);
  await first.post("/api/workspace/suppliers").set(header, ids[0]).send(supplier).expect(201);
  expect((await first.get("/api/workspace/catalog").set(header, ids[0]).expect(200)).body.suppliers).toHaveLength(1);
  expect((await second.get("/api/workspace/catalog").set(header, ids[1]).expect(200)).body.suppliers).toEqual([]);
});
