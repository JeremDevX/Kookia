import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import initial from "../infrastructure/database/seed/menu.json" with { type: "json" };
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Menu test", email: `menu-${randomUUID()}@example.com`, password: "menu integration password" }).expect(201);
  ids.push(result.body.user.id); return agent;
}
it("persists reviewed menus and journals validation once without launching production", async () => {
  const agent = await account(); const other = await account();
  await request(app).get("/api/workspace/menu").expect(401);
  const original = await agent.get("/api/workspace/menu").expect(200);
  expect(original.body).toEqual({ ...initial, revision: 0 });
  const input = { starter: "Entrée revue", main: initial.main, dessert: initial.dessert, revision: 0, validate: false };
  const draft = await agent.post("/api/workspace/menu").send(input).expect(200);
  await agent.post("/api/workspace/menu").send(input).expect(409);
  const validation = { ...input, revision: draft.body.revision, validate: true };
  const [one, two] = await Promise.all([agent.post("/api/workspace/menu").send(validation), agent.post("/api/workspace/menu").send(validation)]);
  expect(one.status).toBe(200); expect(two.status).toBe(200);
  expect(one.body.validatedAt).toBe(two.body.validatedAt);
  const reread = await agent.get("/api/workspace/menu").expect(200);
  expect(reread.body.status).toBe("validated"); expect(reread.body.starter).toBe(input.starter);
  const decisions = await agent.get("/api/workspace/decisions").expect(200);
  expect(decisions.body).toHaveLength(1);
  expect(decisions.body[0].snapshot.reviewed.starter).toBe(input.starter);
  const untouched = await other.get("/api/workspace/menu").expect(200);
  expect(untouched.body).toEqual(original.body);
  const productions = await agent.get("/api/workspace/productions").expect(200);
  expect(productions.body).toEqual([]);
});
