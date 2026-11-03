import express from "express";
import request from "supertest";
import { expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({ getInventorySession: vi.fn(async () => null), openInventorySession: vi.fn(async () => ({})),
  saveInventorySession: vi.fn(), validateInventorySession: vi.fn(), refreshInventorySession: vi.fn(), discardInventorySession: vi.fn() }));
vi.mock("../application/workspace/inventorySessionService.js", () => services);
vi.mock("../application/workspace/lotService.js", () => ({ listStockLots: vi.fn() }));
vi.mock("../application/workspace/wasteService.js", () => ({ listWaste: vi.fn(), recordWaste: vi.fn() }));
import { inventoryRoutes } from "./inventoryRoutes.js";

const app = express();
app.use(express.json());
app.use((_req, res, next) => { res.locals.workspace = { restaurantId: "restaurant-2", actorId: "user-1" }; next(); });
app.use(inventoryRoutes);

it("refuse chaque opération si l’établissement ouvert a changé", async () => {
  for (const [method, path] of [["get", "/inventory-session"], ["post", "/inventory-session"], ["put", "/inventory-session/s1"],
    ["post", "/inventory-session/s1/validate"], ["post", "/inventory-session/s1/refresh"], ["post", "/inventory-session/s1/discard"]] as const) {
    const response = await request(app)[method](path).set("X-Expected-Restaurant-Id", "restaurant-1").send({ revision: 1, lines: [] });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("WORKSPACE_CHANGED");
  }
  expect(services.getInventorySession).not.toHaveBeenCalled();
  expect(services.openInventorySession).not.toHaveBeenCalled();
  expect(services.saveInventorySession).not.toHaveBeenCalled();
  expect(services.validateInventorySession).not.toHaveBeenCalled();
  expect(services.refreshInventorySession).not.toHaveBeenCalled();
  expect(services.discardInventorySession).not.toHaveBeenCalled();
});

it("permet la lecture pour l’établissement attendu", async () => {
  await request(app).get("/inventory-session").set("X-Expected-Restaurant-Id", "restaurant-2").expect(200);
  expect(services.getInventorySession).toHaveBeenCalledWith("restaurant-2");
});
