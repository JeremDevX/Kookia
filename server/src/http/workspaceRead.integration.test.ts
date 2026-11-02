import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: "Lecture test", email: `read-${randomUUID()}@example.com`, password: "read integration password" }).expect(201);
  users.push(response.body.user.id);
  agent.set("X-Expected-User-Id", response.body.user.id);
  await ensureWorkspace(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: response.body.user.id } });
  return { agent, restaurantId: restaurant.id };
}
it("expose l’absence d’analytics sans création ni chiffre fictif et préserve les autres comptes", async () => {
  const { agent, restaurantId } = await account();
  const other = await account();
  await prisma.workspaceDocument.deleteMany({ where: { restaurantId, kind: { in: ["analytics", "activity"] } } });
  for (const kind of ["analytics", "activity"]) {
    await request(app).get(`/api/workspace/${kind}`).expect(401);
    expect((await agent.get(`/api/workspace/${kind}`).expect(200)).body).toBeNull();
    expect((await agent.get(`/api/workspace/${kind}`).expect(200)).body).toBeNull();
    expect(await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } })).toBeNull();
    const stored = await prisma.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: { restaurantId: other.restaurantId, kind } } });
    expect((await other.agent.get(`/api/workspace/${kind}`).expect(200)).body).toEqual(stored.data);
  }
});
