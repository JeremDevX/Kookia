import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { app } from "./app.js";

vi.mock("../application/auth/authService.js", () => ({ getUserBySessionToken: async () => ({ id: "user-1" }) }));
vi.mock("../application/workspace/workspaceIdentity.js", () => ({
  resolveWorkspace: async () => ({ restaurantId: "restaurant-1", role: "owner" }),
}));
vi.mock("../application/workspace/serviceMenuService.js", () => ({ saveServiceMenu: async () => ({ revision: 1 }) }));
vi.mock("../application/workspace/serviceSheetService.js", () => ({ saveServiceSheet: async () => ({ revision: 1 }) }));

const menuPath = "/api/workspace/service-menu";
const sheetPath = "/api/workspace/services/sheet";
const service = { serviceDate: "2026-11-19", slot: "lunch", expectedRevision: 0, note: "" };
const server = createServer(app);

beforeAll(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
});
afterAll(async () => {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
});

it("accepts a valid service menu above the default JSON size limit", async () => {
  const components = Array.from({ length: 4 }, () => ({ recipeId: randomUUID(), portions: 1 }));
  const entries = Array.from({ length: 60 }, (_, index) => ({
    id: randomUUID(), name: `Formule ${index + 1} avec entrée, plat, dessert et boisson`,
    category: "Formule", saleItemId: null, available: true, priceCents: 1800, components,
  }));
  const body = { ...service, operationId: randomUUID(), entries };
  expect(Buffer.byteLength(JSON.stringify(body))).toBeGreaterThan(16 * 1024);
  await request(server).post(menuPath).set("X-Expected-User-Id", "user-1").send(body).expect(201, { revision: 1 });
});

it("accepts a valid service sheet above the default JSON size limit", async () => {
  const outcomes = Array.from({ length: 60 }, () => ({
    recipeId: randomUUID(), retained: 1, discarded: 0,
    note: "Préparation refroidie et conservée pour le service de demain. ".repeat(6),
  }));
  const body = { ...service, operationId: randomUUID(), action: "save", planned: [], outcomes, substitutions: [] };
  expect(Buffer.byteLength(JSON.stringify(body))).toBeGreaterThan(16 * 1024);
  await request(server).post(sheetPath).set("X-Expected-User-Id", "user-1").send(body).expect(200, { revision: 1 });
});

it("keeps distinct caps for service writes and the standard cap elsewhere", async () => {
  const payload = (kibibytes: number) => ({ note: "a".repeat(kibibytes * 1024) });
  await request(server).post(menuPath).send(payload(1024)).expect(413);
  await request(server).post(sheetPath).send(payload(640)).expect(413);
  await request(server).post("/api/auth/register").send(payload(16)).expect(413);
  await request(server).put(menuPath).send(payload(16)).expect(413);
});
