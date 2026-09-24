import "dotenv/config";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";

const email = `integration-${randomUUID()}@example.com`;
const updatedEmail = `integration-updated-${randomUUID()}@example.com`;
const createdIds: string[] = [];
const firstPassword = "integration password one";
const secondPassword = "integration password two";

describe("authentication HTTP flow", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it("returns the API liveness status", async () => {
    await request(app).get("/api/health").expect(200, { status: "ok" });
  });

  it("registers, authenticates, updates account, rotates password and deletes account", async () => {
    const agent = request.agent(app);
    await request(app).post("/api/auth/register").set("Origin", "https://attacker.example")
      .send({ displayName: "Rejected", email: `rejected-${email}`, password: firstPassword }).expect(403);
    const registration = await agent.post("/api/auth/register").set("Origin", env.APP_ORIGIN)
      .send({ displayName: "Integration User", email: ` ${email.toUpperCase()} `, password: firstPassword }).expect(201);
    createdIds.push(registration.body.user.id);
    expect(registration.body.user.passwordHash).toBeUndefined();
    expect(registration.headers["set-cookie"]).toHaveLength(1);

    await request(app).post("/api/auth/register").send({ displayName: "Other", email, password: firstPassword }).expect(409);
    await agent.get("/api/auth/me").expect(200).expect(({ body }) => expect(body.user.email).toBe(email.toUpperCase()));
    await agent.patch("/api/account/profile").send({ displayName: "Updated User" }).expect(200);
    await agent.post("/api/account/change-email").send({ newEmail: updatedEmail, currentPassword: firstPassword }).expect(200);
    await agent.post("/api/account/change-password").send({ currentPassword: firstPassword, newPassword: secondPassword }).expect(204);

    await request(app).post("/api/auth/login").send({ email: updatedEmail, password: firstPassword }).expect(401);
    await request(app).post("/api/auth/login").send({ email: updatedEmail, password: secondPassword }).expect(200);
    const logoutAgent = request.agent(app);
    await logoutAgent.post("/api/auth/login").send({ email: updatedEmail, password: secondPassword }).expect(200);
    await logoutAgent.post("/api/auth/logout").expect(204);
    await logoutAgent.post("/api/auth/logout").expect(204);
    await agent.delete("/api/account").send({ currentPassword: secondPassword }).expect(204);
    expect(await prisma.user.findUnique({ where: { emailNormalized: updatedEmail } })).toBeNull();
  });

  it("rejects unauthenticated account access", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).patch("/api/account/profile").send({ displayName: "No access" }).expect(401);
  });
});
