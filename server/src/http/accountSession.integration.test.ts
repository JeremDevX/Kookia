import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
it("protects account changes and logout from a changed session", async () => {
  const first = request.agent(app), second = request.agent(app);
  for (const agent of [first, second]) {
    const user = await agent.post("/api/auth/register").send({ displayName: "Test", email: `account-${randomUUID()}@example.com`, password: "test account password" }).expect(201);
    ids.push(user.body.user.id);
  }
  for (const call of [second.patch("/api/account/profile").send({ displayName: "Changed" }),
    second.post("/api/account/change-email").send({ newEmail: "other@example.com", currentPassword: "test account password" }),
    second.post("/api/account/change-password").send({ currentPassword: "test account password", newPassword: "another test password" }),
    second.delete("/api/account").send({ currentPassword: "test account password" }), second.post("/api/auth/logout")]) {
    const result = await call.set("X-Expected-User-Id", ids[0]).expect(409);
    expect(result.body.error.code).toBe("SESSION_CHANGED");
    expect(result.headers["set-cookie"]).toBeUndefined();
  }
  expect((await second.post("/api/auth/logout").expect(409)).body.error.code).toBe("SESSION_CHANGED");
  expect((await second.patch("/api/account/profile").send({ displayName: "Changed" }).expect(409)).body.error.code).toBe("SESSION_CHANGED");
  expect((await second.get("/api/auth/me").expect(200)).body.user.id).toBe(ids[1]);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: ids[1] } })).displayName).toBe("Test");
  await second.patch("/api/account/profile").set("X-Expected-User-Id", ids[1]).send({ displayName: "Updated" }).expect(200);
  await second.post("/api/auth/logout").set("X-Expected-User-Id", ids[1]).expect(204);
  expect((await second.post("/api/auth/logout").expect(204)).headers["set-cookie"]).toBeUndefined();
  await second.patch("/api/account/profile").send({ displayName: "None" }).expect(401);
  await prisma.session.updateMany({ where: { userId: ids[0] }, data: { expiresAt: new Date(0) } });
  expect((await first.post("/api/auth/logout").set("X-Expected-User-Id", ids[1]).expect(204)).headers["set-cookie"]).toBeUndefined();
  expect((await first.post("/api/auth/logout").expect(204)).headers["set-cookie"]).toBeUndefined();
});
