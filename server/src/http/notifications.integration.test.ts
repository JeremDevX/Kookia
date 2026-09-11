import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import initial from "../infrastructure/database/seed/notifications.json" with { type: "json" };
const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: "Notifications test", email: `notifications-${randomUUID()}@example.com`, password: "notifications test password" }).expect(201);
  users.push(response.body.user.id);
  return agent;
}
it("persists notification reads without changing initial data or another account", async () => {
  const agent = await account();
  const other = await account();
  await request(app).get("/api/workspace/notifications").expect(401);
  const initialRead = await agent.get("/api/workspace/notifications").expect(200);
  expect(initialRead.body).toEqual(initial);
  const ids = [initial[0].id];
  await agent.post("/api/workspace/notifications/read").send({ ids }).expect(200);
  await agent.post("/api/workspace/notifications/read").send({ ids }).expect(200);
  const reread = await agent.get("/api/workspace/notifications").expect(200);
  expect(reread.body[0]).toEqual({ ...initial[0], read: true });
  expect(reread.body[1]).toEqual(initial[1]);
  const isolated = await other.get("/api/workspace/notifications").expect(200);
  expect(isolated.body).toEqual(initial);
  await agent.post("/api/workspace/notifications/read").send({ ids: "all" }).expect(400);
});
