import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

it("reports only unconnected sources to an authenticated workspace", async () => {
  const first = request.agent(app);
  const firstRegistration = await first.post("/api/auth/register").send({
    displayName: "Sources test",
    email: `sources-${randomUUID()}@example.com`,
    password: "sources integration password",
  }).expect(201);
  userIds.push(firstRegistration.body.user.id);

  const second = request.agent(app);
  const secondRegistration = await second.post("/api/auth/register").send({
    displayName: "Other sources test",
    email: `sources-${randomUUID()}@example.com`,
    password: "other sources integration password",
  }).expect(201);
  userIds.push(secondRegistration.body.user.id);

  const expected = {
    sources: ["pos", "ticket_ocr", "geocoding", "weather", "events"].map((kind) => ({
      kind,
      state: "not_connected",
      lastSuccessAt: null,
    })),
  };
  const firstStatus = await first.get(`/api/workspace/sources?restaurantId=${randomUUID()}`).expect(200);
  const secondStatus = await second.get("/api/workspace/sources").expect(200);
  expect(firstStatus.body).toEqual(expected);
  expect(secondStatus.body).toEqual(expected);
  await request(app).get("/api/workspace/sources").expect(401);
});
