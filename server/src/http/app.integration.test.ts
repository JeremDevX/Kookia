import "dotenv/config";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const email = "integration@example.com";
const firstPassword = "integration password one";
const secondPassword = "integration password two";

describe("authentication HTTP flow", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { emailNormalized: email } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { emailNormalized: "integration.updated@example.com" } });
    await prisma.$disconnect();
  });

  it("registers, authenticates, updates account, rotates password and deletes account", async () => {
    const agent = request.agent(app);
    const registration = await agent.post("/api/auth/register").send({ displayName: "Integration User", email: ` ${email.toUpperCase()} `, password: firstPassword }).expect(201);
    expect(registration.body.user.passwordHash).toBeUndefined();
    expect(registration.headers["set-cookie"]).toHaveLength(1);

    await request(app).post("/api/auth/register").send({ displayName: "Other", email, password: firstPassword }).expect(409);
    await agent.get("/api/auth/me").expect(200).expect(({ body }) => expect(body.user.email).toBe("INTEGRATION@EXAMPLE.COM"));
    await agent.patch("/api/account/profile").send({ displayName: "Updated User" }).expect(200);
    await agent.post("/api/account/change-email").send({ newEmail: "integration.updated@example.com", currentPassword: firstPassword }).expect(200);
    await agent.post("/api/account/change-password").send({ currentPassword: firstPassword, newPassword: secondPassword }).expect(204);

    await request(app).post("/api/auth/login").send({ email: "integration.updated@example.com", password: firstPassword }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "integration.updated@example.com", password: secondPassword }).expect(200);
    const logoutAgent = request.agent(app);
    await logoutAgent.post("/api/auth/login").send({ email: "integration.updated@example.com", password: secondPassword }).expect(200);
    await logoutAgent.post("/api/auth/logout").expect(204);
    await logoutAgent.post("/api/auth/logout").expect(204);
    await agent.delete("/api/account").send({ currentPassword: secondPassword }).expect(204);
    expect(await prisma.user.findUnique({ where: { emailNormalized: "integration.updated@example.com" } })).toBeNull();
  });

  it("rejects unauthenticated account access", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).patch("/api/account/profile").send({ displayName: "No access" }).expect(401);
  });
});
