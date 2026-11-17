import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { simulationActor } from "../application/workspace/operationProvenance.js";
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
it("exports database records within the selected interval and excludes another account", async () => {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Report test", email: `report-${randomUUID()}@example.com`, password: "report integration password" }).expect(201);
  ids.push(result.body.user.id);
  agent.set("X-Expected-User-Id", result.body.user.id);
  const restaurant = await ensureWorkspace(result.body.user.id);
  await request(app).get("/api/workspace/report?from=2026-09-01&to=2026-09-30").expect(401);
  await agent.get("/api/workspace/report?from=invalid&to=2026-09-30").expect(400);
  await agent.get("/api/workspace/report?from=2026-10-01&to=2026-09-30").expect(400);
  const record = { operationId: randomUUID(), recipeName: "Exported production", portions: 4, prepTime: 1, notes: "", date: "2026-09-10", kind: "record" };
  await agent.post("/api/workspace/productions").send(record).expect(201);
  const outside = await agent.get("/api/workspace/report?from=2020-01-01&to=2020-01-31").expect(200);
  expect(outside.body.rows).toEqual([]);
  const exact = await agent.get("/api/workspace/report?from=2026-09-10&to=2026-09-10").expect(200);
  expect(exact.body.rows.some((row: { metric: string }) => row.metric.includes("Exported production"))).toBe(true);
  expect(exact.body.rows.some((row: { section: string }) => row.section === "Instantané analytics")).toBe(false);
  const saleItem = await agent.post("/api/workspace/sales/items").send({ name: "Plat du jour" }).expect(201);
  await agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: saleItem.body.id, serviceDate: "2026-09-10", quantity: 4 }).expect(201);
  const withSales = await agent.get("/api/workspace/report?from=2026-09-10&to=2026-09-10").expect(200);
  expect(withSales.body.rows).toContainEqual(expect.objectContaining({ section: "Ventes enregistrées", metric: "Plat du jour — unités vendues", value: 4, source: "Saisie manuelle" }));
  const simulatedDay = new Date("2026-09-11T00:00:00Z");
  await prisma.serviceDay.create({ data: { restaurantId: restaurant.id, serviceDate: simulatedDay,
    status: "open", coverage: "complete", source: "demo_simulation", actorId: simulationActor } });
  await prisma.dailySale.create({ data: { restaurantId: restaurant.id, serviceDate: simulatedDay,
    saleItemId: saleItem.body.id, source: "manual", quantity: 2, operationId: randomUUID(),
    createdBy: result.body.user.id, updatedBy: result.body.user.id } });
  await prisma.production.create({ data: { ...record, date: simulatedDay, restaurantId: restaurant.id,
    operationId: randomUUID(), actorId: simulationActor } });
  const order = await prisma.purchaseOrder.create({ data: { restaurantId: restaurant.id, createdAt: simulatedDay,
    operationId: randomUUID(), actorId: simulationActor, status: "simulated_received",
    lines: { create: { productId: "product", productName: "Tomates", supplierId: "supplier",
      supplierName: "Fournisseur", quantity: 1, unit: "kg", pricePerUnit: 2 } } } });
  const demoDate = await agent.get("/api/workspace/report?from=2026-09-11&to=2026-09-11").expect(200);
  expect(demoDate.body.rows).toEqual([]);
  await prisma.purchaseOrder.update({ where: { id: order.id }, data: { status: "received" } });
  const withOrder = await agent.get("/api/workspace/report?from=2026-09-11&to=2026-09-11").expect(200);
  expect(withOrder.body.rows).toEqual([expect.objectContaining({ section: "Commandes validées", metric: "Tomates — 1 kg", value: 2 })]);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0];
  await agent.post(`/api/workspace/products/${product.id}/stock`).send({ operationId: randomUUID(), delta: 1.5, expectedStockRevision: product.stockRevision, expectedUnit: product.unit }).expect(200);
  const today = new Date().toISOString().slice(0, 10);
  const operational = await agent.get(`/api/workspace/report?from=${today}&to=${today}`).expect(200);
  expect(operational.body.rows).toContainEqual(expect.objectContaining({
    section: "Mouvements de stock", metric: `${product.name} — adjustment (${product.unit})`, value: 1.5,
  }));
  const withoutDemo = await agent.get("/api/workspace/report?from=2026-09-01&to=2026-09-30").expect(200);
  expect(withoutDemo.body.rows.some((row: { section: string }) => row.section === "Prévisions" || row.section === "Instantané analytics")).toBe(false);
  const other = request.agent(app);
  const registration = await other.post("/api/auth/register").send({ displayName: "Other report", email: `report-${randomUUID()}@example.com`, password: "report integration password" }).expect(201);
  ids.push(registration.body.user.id);
  other.set("X-Expected-User-Id", registration.body.user.id);
  await ensureWorkspace(registration.body.user.id);
  const isolated = await other.get("/api/workspace/report?from=2026-09-10&to=2026-09-10").expect(200);
  expect(isolated.body.rows.some((row: { metric: string }) => row.metric.includes("Exported production"))).toBe(false);
  expect(isolated.body.declaredLosses.reportedMovementCount).toBe(0);
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: { mode: "demo" } });
  const demoWorkspace = await agent.get("/api/workspace/report?from=2026-09-10&to=2026-09-11").expect(200);
  expect(demoWorkspace.body.rows).toEqual([]);
});
