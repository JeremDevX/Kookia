import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ownerIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ownerIds } } }); await prisma.$disconnect(); });
const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const shiftDay = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};
it("compares equal calendar periods, traces losses/receipts, and excludes simulation and incompatible units", async () => {
  const agent = request.agent(app);
  const registration = await agent.post("/api/auth/register").send({ displayName: "Impact test",
    email: `impact-${randomUUID()}@example.com`, password: "impact integration password" }).expect(201);
  ownerIds.push(registration.body.user.id);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: registration.body.user.id } });
  const product = catalog.body.products[0];
  await request(app).get("/api/workspace/impact?from=2026-09-01&to=2026-09-01").expect(401);

  const serviceDate = parisToday();
  const serviceDay = new Date(`${serviceDate}T00:00:00.000Z`);
  await prisma.serviceDay.create({ data: { restaurantId: restaurant.id, serviceDate: serviceDay, status: "open",
    coverage: "complete", source: "recorded", actorId: registration.body.user.id } });
  await prisma.serviceDay.createMany({ data: [
    { restaurantId: restaurant.id, serviceDate: new Date(`${shiftDay(serviceDate, -1)}T00:00:00.000Z`),
      status: "open", coverage: "complete", source: "demo_simulation", actorId: registration.body.user.id },
    { restaurantId: restaurant.id, serviceDate: new Date(`${shiftDay(serviceDate, -2)}T00:00:00.000Z`),
      status: "open", coverage: "partial", source: "demo_simulation", actorId: registration.body.user.id },
    { restaurantId: restaurant.id, serviceDate: new Date(`${shiftDay(serviceDate, -3)}T00:00:00.000Z`),
      status: "open", coverage: "missing", source: "demo_simulation", actorId: registration.body.user.id },
    { restaurantId: restaurant.id, serviceDate: new Date(`${shiftDay(serviceDate, -4)}T00:00:00.000Z`),
      status: "closed", coverage: "complete", source: "demo_simulation", actorId: registration.body.user.id },
  ] });
  const recordedItem = await agent.post("/api/workspace/sales/items").send({ name: "Plat constaté" }).expect(201);
  const simulatedItem = await agent.post("/api/workspace/sales/items").send({ name: "Plat simulé" }).expect(201);
  await prisma.dailySale.createMany({ data: [
    { restaurantId: restaurant.id, saleItemId: recordedItem.body.id, serviceDate: serviceDay, quantity: 4,
      source: "manual", operationId: randomUUID(), createdBy: registration.body.user.id, updatedBy: registration.body.user.id },
    { restaurantId: restaurant.id, saleItemId: simulatedItem.body.id, serviceDate: serviceDay, quantity: 80,
      source: "demo_simulation", operationId: randomUUID(), createdBy: registration.body.user.id, updatedBy: registration.body.user.id },
  ] });

  await prisma.product.update({ where: { restaurantId_id: { restaurantId: restaurant.id, id: product.id } },
    data: { currentStock: 2, stockRevision: { increment: 1 } } });
  const reportedLossOperationId = randomUUID();
  await agent.post(`/api/workspace/products/${product.id}/stock`).send({ operationId: reportedLossOperationId,
    delta: -0.5, reason: "loss" }).expect(200);
  const unpricedLossOperationId = `loss-unpriced-${randomUUID()}`;
  const mismatchLossOperationId = `loss-unit-${randomUUID()}`;
  const simulatedLossOperationId = `restaurant-simulation-v1:loss:${randomUUID()}`;
  await prisma.stockMovement.createMany({ data: [
    { restaurantId: restaurant.id, productId: product.id, delta: -0.25, reason: "loss", operationId: unpricedLossOperationId,
      actorId: registration.body.user.id, productNameSnapshot: product.name, productUnitSnapshot: product.unit },
    { restaurantId: restaurant.id, productId: product.id, delta: -0.25, reason: "loss", operationId: mismatchLossOperationId,
      actorId: registration.body.user.id, productNameSnapshot: product.name, productUnitSnapshot: "L", unitPriceSnapshot: product.pricePerUnit },
    { restaurantId: restaurant.id, productId: product.id, delta: -1.5, reason: "simulation_loss",
      operationId: simulatedLossOperationId, actorId: "restaurant-simulation:v1",
      productNameSnapshot: product.name, productUnitSnapshot: product.unit, unitPriceSnapshot: product.pricePerUnit },
  ] });

  const utcToday = new Date().toISOString().slice(0, 10);
  const from = shiftDay(utcToday, -4);
  const to = serviceDate > utcToday ? serviceDate : utcToday;
  const response = await agent.get(`/api/workspace/impact?from=${from}&to=${to}`).expect(200);
  expect(response.body).toMatchObject({ comparison: "same_number_of_calendar_days", timezone: "Europe/Paris",
    currency: "EUR", unavailableMetrics: ["stockouts", "unsold_quantity"], savingsClaim: "not_measured" });
  expect(response.body.current.calendarDays).toBe(response.body.prior.calendarDays);
  expect(response.body.current.recorded).toMatchObject({ menuItemUnits: 4, serviceDays: { complete: 1 },
    lossMovementCount: 2, knownLossCost: product.pricePerUnit * 0.5, unpricedLossMovementCount: 1 });
  expect(response.body.current.recorded.lossesByProduct).toMatchObject([{ productId: product.id, quantity: 0.75,
    movementCount: 2, unpricedMovementCount: 1 }]);
  expect(response.body.current.simulation).toMatchObject({ menuItemUnits: 80, lossMovementCount: 1,
    serviceDays: { complete: 1, partial: 1, coverageMissing: 1, closed: 1 } });
  expect(response.body.current.excluded).toMatchObject({ simulatedSales: 1, simulatedLosses: 1, lossUnitMismatch: 1 });
  expect(response.body.current.recorded.lossesByProduct[0].operationIds).toHaveLength(2);
  const exportedReport = await agent.get(`/api/workspace/report?from=${from}&to=${to}`).expect(200);
  expect(exportedReport.body.declaredLosses).toMatchObject({
    dateBasis: expect.stringContaining("UTC"), reportedMovementCount: 2, unpricedMovementCount: 1,
    incompatibleUnitMovementCount: 1, excludedSimulationMovementCount: 1,
    unavailableMetrics: ["stockouts", "unsold_quantity"],
  });
  expect(exportedReport.body.rows).toContainEqual(expect.objectContaining({ section: "Pertes déclarées",
    metric: expect.stringContaining("quantité perdue"), value: 0.5, source: expect.stringContaining(reportedLossOperationId) }));
  expect(exportedReport.body.rows).toContainEqual(expect.objectContaining({ section: "Pertes déclarées",
    metric: expect.stringContaining("coût connu"), value: (product.pricePerUnit * 0.5).toFixed(2),
    source: expect.stringContaining(reportedLossOperationId) }));
  expect(exportedReport.body.rows).toContainEqual(expect.objectContaining({ section: "Pertes déclarées",
    metric: expect.stringContaining("coût connu"), value: "Non valorisé",
    source: expect.stringContaining(unpricedLossOperationId) }));
  expect(exportedReport.body.rows).toContainEqual(expect.objectContaining({ section: "Pertes à vérifier",
    value: 0.25, source: expect.stringContaining(mismatchLossOperationId) }));
  expect(exportedReport.body.rows.some((row: { source: string }) => row.source.includes(simulatedLossOperationId))).toBe(false);
  expect(exportedReport.body.rows.some((row: { metric: string }) => row.metric.includes("Plat simulé") || row.metric.includes("simulation_loss"))).toBe(false);

  const empty = await agent.get("/api/workspace/impact?from=2020-01-01&to=2020-01-01").expect(200);
  expect(empty.body.current.hasRecordedData).toBe(false);
  expect(empty.body.monthly).toBeUndefined();
  expect(empty.body.current.recorded).toMatchObject({ menuItemUnits: 0, lossMovementCount: 0, receivedCost: 0,
    serviceDays: { complete: 0 } });
  const fourYearMonthly = await agent.get("/api/workspace/impact").query({
    from: "2020-01-01", to: "2023-12-31", monthly: "true",
  }).expect(200);
  expect(fourYearMonthly.body.monthly).toHaveLength(48);
  expect(fourYearMonthly.body.monthly[0]).toMatchObject({ month: "2020-01", from: "2020-01-01", to: "2020-01-31" });
  await agent.get("/api/workspace/impact").query({ from: "2020-01-01", to: "2024-01-01", monthly: "true" }).expect(400);
  await agent.get("/api/workspace/impact?from=2026-09-02&to=2026-09-01").expect(400);
});
