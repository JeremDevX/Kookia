import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { hashSessionToken } from "../security/sessionToken.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
const restaurant = { name: "Test", type: "Restaurant", address: "", city: "Test", phone: "", email: "test@example.com", dailyCovers: 0 };
async function account(owner = false) {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Test", email: `invitation-${randomUUID()}@example.com`, password: "test invitation password" }).expect(201);
  const id = result.body.user.id as string; ids.push(id); agent.set("X-Expected-User-Id", id);
  if (owner) await agent.post("/api/setup").send({ ...restaurant, expectedUserId: id }).expect(201);
  return { agent, id };
}
it("isolates, expires and consumes invitations once and grants member workspace access", async () => {
  const owner = await account(true), otherOwner = await account(true), first = await account(), second = await account();
  await owner.agent.post("/api/workspace/invitations").send({ role: "admin" }).expect(400);
  const created = await owner.agent.post("/api/workspace/invitations").send({ role: "chef" }).expect(201);
  expect(created.headers["cache-control"]).toBe("no-store");
  const token = new URL(created.body.link).hash.slice("#token=".length);
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  const stored = await prisma.invitation.findUniqueOrThrow({ where: { id: created.body.id } });
  expect(stored.tokenHash).toBe(hashSessionToken(token));
  expect(JSON.stringify(stored)).not.toContain(token);
  const listed = await owner.agent.get("/api/workspace/invitations").expect(200);
  expect(JSON.stringify(listed.body)).not.toContain(token);
  expect((await otherOwner.agent.get("/api/workspace/invitations").expect(200)).body).toEqual([]);
  await otherOwner.agent.delete(`/api/workspace/invitations/${created.body.id}`).expect(404);
  await request(app).post("/api/invitations/accept").send({ token }).expect(401);
  expect((await first.agent.post("/api/invitations/accept").set("X-Expected-User-Id", owner.id).send({ token }).expect(409)).body.error.code).toBe("SESSION_CHANGED");
  expect((await otherOwner.agent.post("/api/invitations/accept").send({ token }).expect(409)).body.error.code).toBe("ALREADY_MEMBER");
  const attempts = await Promise.all([first.agent.post("/api/invitations/accept").send({ token }), second.agent.post("/api/invitations/accept").send({ token })]);
  expect(attempts.map(result => result.status).sort()).toEqual([201, 409]);
  const winner = attempts[0].status === 201 ? first : second;
  const loser = winner === first ? second : first;
  expect((await prisma.membership.findUniqueOrThrow({ where: { userId: winner.id } })).role).toBe("chef");
  expect((await winner.agent.get("/api/workspace/catalog").expect(200)).body).toEqual({ products: [], suppliers: [] });
  expect((await winner.agent.post("/api/setup").send({ ...restaurant, expectedUserId: winner.id }).expect(409)).body.error.code).toBe("ALREADY_MEMBER");
  expect((await loser.agent.post("/api/invitations/accept").send({ token }).expect(409)).body.error.code).toBe("INVITATION_INVALID");
  const revoked = await owner.agent.post("/api/workspace/invitations").send({ role: "kitchen" }).expect(201);
  await owner.agent.delete(`/api/workspace/invitations/${revoked.body.id}`).expect(204);
  const revokedToken = new URL(revoked.body.link).hash.slice("#token=".length);
  expect((await loser.agent.post("/api/invitations/accept").send({ token: revokedToken }).expect(409)).body.error.code).toBe("INVITATION_INVALID");
  const expired = await owner.agent.post("/api/workspace/invitations").send({ role: "kitchen" }).expect(201);
  await prisma.invitation.update({ where: { id: expired.body.id }, data: { expiresAt: new Date(0) } });
  const expiredToken = new URL(expired.body.link).hash.slice("#token=".length);
  expect((await loser.agent.post("/api/invitations/accept").send({ token: expiredToken }).expect(409)).body.error.code).toBe("INVITATION_INVALID");
  const other = await otherOwner.agent.post("/api/workspace/invitations").send({ role: "kitchen" }).expect(201);
  const otherToken = new URL(other.body.link).hash.slice("#token=".length);
  expect((await winner.agent.post("/api/invitations/accept").send({ token: otherToken }).expect(409)).body.error.code).toBe("ALREADY_MEMBER");
  expect((await owner.agent.get("/api/workspace/members").expect(200)).body).toEqual([expect.objectContaining({ userId: winner.id, role: "chef" })]);
  expect((await otherOwner.agent.get("/api/workspace/members").expect(200)).body).toEqual([]);
  await otherOwner.agent.delete(`/api/workspace/members/${winner.id}`).expect(404);
  await owner.agent.delete(`/api/workspace/members/${winner.id}`).expect(204);
  expect((await owner.agent.get("/api/workspace/members").expect(200)).body).toEqual([]);
});

it("serializes setup against acceptance and revocation against acceptance", async () => {
  const owner = await account(true), candidate = await account(), candidate2 = await account();
  const first = await owner.agent.post("/api/workspace/invitations").send({ role: "chef" }).expect(201);
  const token = new URL(first.body.link).hash.slice("#token=".length);
  const [setup, acceptance] = await Promise.all([
    candidate.agent.post("/api/setup").send({ ...restaurant, expectedUserId: candidate.id }),
    candidate.agent.post("/api/invitations/accept").send({ token }),
  ]);
  expect([setup.status, acceptance.status].sort()).toEqual([201, 409]);
  expect(await prisma.restaurant.count({ where: { ownerId: candidate.id } }) + await prisma.membership.count({ where: { userId: candidate.id } })).toBe(1);
  const second = await owner.agent.post("/api/workspace/invitations").send({ role: "kitchen" }).expect(201);
  const token2 = new URL(second.body.link).hash.slice("#token=".length);
  const [revocation, accepted] = await Promise.all([
    owner.agent.delete(`/api/workspace/invitations/${second.body.id}`),
    candidate2.agent.post("/api/invitations/accept").send({ token: token2 }),
  ]);
  expect([[204, 409], [404, 201]]).toContainEqual([revocation.status, accepted.status]);
  const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id: second.body.id } });
  expect(Boolean(invitation.revokedAt)).not.toBe(Boolean(invitation.acceptedAt));
  expect(await prisma.membership.count({ where: { userId: candidate2.id } })).toBe(accepted.status === 201 ? 1 : 0);
});
