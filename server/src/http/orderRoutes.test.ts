import express from "express";
import request from "supertest";
import { expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({ getPurchaseReconciliation: vi.fn(async () => ({})), recordPurchaseCredit: vi.fn(async () => ({})) }));
vi.mock("../application/workspace/purchaseReconciliationService.js", async () => {
  const { z } = await import("zod");
  return { ...services, purchaseCreditSchema: z.object({}).passthrough() };
});
import { orderRoutes } from "./orderRoutes.js";

const app = express();
app.use(express.json());
app.use((_req, res, next) => { res.locals.workspace = { restaurantId: "restaurant-2", actorId: "user-1" }; next(); });
app.use(orderRoutes);
const orderId = "00000000-0000-4000-8000-000000000001";

it("refuse de lire ou d’enregistrer un avoir si l’établissement a changé", async () => {
  const read = await request(app).get(`/orders/${orderId}/reconciliation`).set("X-Expected-Restaurant-Id", "restaurant-1");
  const write = await request(app).post("/orders/credits").set("X-Expected-Restaurant-Id", "restaurant-1").send({});
  expect(read.status).toBe(409); expect(read.body.error.code).toBe("WORKSPACE_CHANGED");
  expect(write.status).toBe(409); expect(write.body.error.code).toBe("WORKSPACE_CHANGED");
  expect(services.getPurchaseReconciliation).not.toHaveBeenCalled(); expect(services.recordPurchaseCredit).not.toHaveBeenCalled();
});

it("accepte la lecture et l’enregistrement pour l’établissement attendu", async () => {
  await request(app).get(`/orders/${orderId}/reconciliation`).set("X-Expected-Restaurant-Id", "restaurant-2").expect(200);
  await request(app).post("/orders/credits").set("X-Expected-Restaurant-Id", "restaurant-2").send({}).expect(201);
  expect(services.getPurchaseReconciliation).toHaveBeenCalledWith("restaurant-2", orderId);
  expect(services.recordPurchaseCredit).toHaveBeenCalledWith("restaurant-2", "user-1", {});
});
