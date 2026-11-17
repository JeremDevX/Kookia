import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { app } from "./app.js";

const users: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: "Historique de test", email: `timeline-${randomUUID()}@example.com`, password: "timeline test password",
  }).expect(201);
  const userId: string = response.body.user.id;
  users.push(userId);
  agent.set("X-Expected-User-Id", userId);
  await ensureWorkspace(userId);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: userId } });
  return { agent, restaurantId: restaurant.id };
}

it("searches beyond the old caps and resumes ties in a stable order", async () => {
  const { agent, restaurantId } = await account();
  const date = "2023-04-02";
  const updatedAt = new Date("2023-04-02T17:00:00.000Z");
  const ids = Array.from({ length: 5_006 }, (_, index) => index.toString().padStart(6, "0"));
  await prisma.workspaceDocument.createMany({ data: ids.map((id, index) => ({
    restaurantId, kind: `source-invoice:${id}`, updatedAt,
    data: { date, title: index >= 5_003 ? "Crème fraîche" : "Farine", content: "Marque interne", originalDate: "2001-01-01" },
  })) });
  const timeline = () => agent.get("/api/workspace/timeline").query({ from: date, to: date, asOf: date, limit: 2 });
  const first = await timeline().expect(200);
  const second = await timeline().query({ cursor: first.body.nextCursor }).expect(200);
  const eventIds = (events: Array<{ id: string }>) => events.map(({ id }) => id);
  const docIds = (numbers: string[]) => numbers.map((id) => `document:source-invoice:${id}`);
  expect(eventIds(first.body.events)).toEqual(docIds(ids.slice(0, 2)));
  expect(eventIds(second.body.events)).toEqual(docIds(ids.slice(2, 4)));
  await timeline().query({ cursor: "malformed" }).expect(400);

  const search = () => timeline().query({ q: "CREME FRAICHE" });
  const scan1 = await search().expect(200);
  expect(scan1.body.events).toEqual([]);
  const scan2 = await search().query({ cursor: scan1.body.nextCursor }).expect(200);
  expect(scan2.body.events).toEqual([]);
  const found = await search().query({ cursor: scan2.body.nextCursor }).expect(200);
  expect(eventIds(found.body.events)).toEqual(docIds(ids.slice(5_003, 5_005)));
  const last = await search().query({ cursor: found.body.nextCursor }).expect(200);
  expect(eventIds(last.body.events)).toEqual(docIds(ids.slice(5_005)));
  expect(last.body.nextCursor).toBeNull();
});

it("keeps blank-date documents behind the knowledge cut and searches only rendered metadata in the tenant", async () => {
  const { agent, restaurantId } = await account();
  const other = await account();
  await prisma.workspaceDocument.createMany({ data: [
    { restaurantId, kind: "invoice:blank-date", data: { date: "", title: "Brouillon sans date", originalDate: "2000-01-01",
      content: "Marque de transcription privée", stockLines: [{ name: "Annotation confidentielle" }] },
    updatedAt: new Date("2023-04-02T17:00:00.000Z") },
    { restaurantId: other.restaurantId, kind: "invoice:other-tenant", data: { date: "", title: "Brouillon sans date" },
      updatedAt: new Date("2023-04-02T17:00:00.000Z") },
  ] });
  const search = (q: string, asOf = "2023-04-02") => agent.get("/api/workspace/timeline")
    .query({ from: "2023-04-01", to: "2023-04-02", asOf, limit: 20, q }).expect(200);
  const { body } = await search("sans date");
  expect(body.events).toEqual([expect.objectContaining({ id: "document:invoice:blank-date",
    effectiveAt: null, provenance: "unknown", detail: expect.stringContaining("Brouillon sans date") })]);
  expect(JSON.stringify(body.events)).not.toMatch(/2000-01-01|privée|confidentielle/);
  expect((await search("sans date", "2023-04-01")).body.events).toEqual([]);
  for (const hidden of ["2000-01-01", "marque de transcription", "annotation confidentielle"]) {
    expect((await search(hidden)).body.events).toEqual([]);
  }
});
