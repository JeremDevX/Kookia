import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
const restaurant = { name: "Test", type: "Restaurant", address: "", city: "Test", phone: "", email: "test@example.com", dailyCovers: 0 };
async function account(owner = false) {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Test", email: `delete-${randomUUID()}@example.com`, password: "test invitation password" }).expect(201);
  const id = result.body.user.id as string; ids.push(id); agent.set("X-Expected-User-Id", id);
  if (owner) await agent.post("/api/setup").send({ ...restaurant, expectedUserId: id }).expect(201);
  return { agent, id };
}
it("handles account deletion racing with acceptance", async () => {
  const owner = await account(true), candidate = await account();
  const invitation = await owner.agent.post("/api/workspace/invitations").send({ role: "chef" }).expect(201);
  const token = new URL(invitation.body.link).hash.slice("#token=".length);
  const [deletion, acceptance] = await Promise.all([
    owner.agent.delete("/api/account").send({ currentPassword: "test invitation password" }),
    candidate.agent.post("/api/invitations/accept").send({ token }),
  ]);
  expect(deletion.status).toBe(204);
  expect([201, 409]).toContain(acceptance.status);
  expect(await prisma.membership.count({ where: { userId: candidate.id } })).toBe(0);
  const owner2 = await account(true), candidate2 = await account();
  const next = await owner2.agent.post("/api/workspace/invitations").send({ role: "kitchen" }).expect(201);
  const token2 = new URL(next.body.link).hash.slice("#token=".length);
  const [deleted, accepted] = await Promise.all([
    candidate2.agent.delete("/api/account").send({ currentPassword: "test invitation password" }),
    candidate2.agent.post("/api/invitations/accept").send({ token: token2 }),
  ]);
  expect(deleted.status).toBe(204);
  expect([201, 401, 409]).toContain(accepted.status);
  expect(await prisma.membership.count({ where: { userId: candidate2.id } })).toBe(0);
});
