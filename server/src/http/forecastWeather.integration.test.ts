import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../infrastructure/database/prisma.js";
import { env } from "../config/env.js";
import { WeatherProviderError } from "../integrations/weatherProvider.js";
import type { OperationalForecast } from "../../../shared/operationalForecast.js";
import type { PurchaseSuggestions } from "../application/workspace/purchaseSuggestionService.js";
import { weatherAccount, weatherDate, weatherForecast, weatherProvider } from "./weatherTestFixture.js";

const users: string[] = [];
const originalMode = env.OPEN_METEO_MODE;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${weatherDate}T08:00:00Z`)); env.OPEN_METEO_MODE = "evaluation"; });
afterEach(() => { vi.useRealTimers(); env.OPEN_METEO_MODE = originalMode; });
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

it("adjusts service and ingredient forecasts, invalidates changed references and preserves reviewed decisions", async () => {
  // Synthetic live-provenance provider; no external network or operational account.
  const provider = weatherProvider("live"), owner = await weatherAccount(users, provider);
  await owner.weekly(); const plan = await owner.plan();
  const menu = (await owner.agent.get("/api/workspace/service-menu").query({ date: weatherDate, slot: "lunch" }).expect(200)).body;
  for (let week = 1; week <= 4; week++) {
    const serviceDate = new Date(Date.parse(weatherDate) - week * 7 * 86400000).toISOString().slice(0, 10);
    const sale = (await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: menu.entries[0].saleItemId, serviceDate, quantity: 10 }).expect(201)).body;
    await owner.agent.put(`/api/workspace/sales/${sale.id}/services`).send({ lunchQuantity: 10, dinnerQuantity: 0, expectedRevision: 0, expectedSaleRevision: 0 }).expect(200);
    await owner.agent.put("/api/workspace/services/calendar").send({ serviceDate, slot: "lunch", plannedOpen: true, coverage: "complete", actualCovers: 10, expectedRevision: 0, note: "Synthetic complete service" }).expect(200);
  }
  // Qualify only our synthetic history as known before this forecast's instant.
  const where = { restaurantId: owner.restaurantId }, data = { updatedAt: new Date("2026-09-27T12:00:00Z") };
  await prisma.dailySale.updateMany({ where, data });
  await prisma.saleServiceAllocation.updateMany({ where, data });
  await prisma.restaurantServiceSession.updateMany({ where, data });
  const profile = (await owner.agent.get("/api/workspace/restaurant").expect(200)).body;
  const terrace = (hasTerrace: boolean | null) => owner.agent.patch("/api/workspace/restaurant").send({ ...profile, hasTerrace }).expect(200);
  const forecast = async () => {
    const result = (await owner.agent.get("/api/workspace/service-forecast").query({ from: weatherDate, to: weatherDate }).expect(200)).body as OperationalForecast;
    return result.services.find(service => service.slot === "lunch")!;
  };
  const purchases = async () => (await owner.agent.get("/api/workspace/orders/suggestions").expect(200)).body as PurchaseSuggestions;
  const stockBefore = await prisma.stockMovement.count({ where });
  await terrace(true);
  expect((await forecast()).items[0].quantity).toBe(10); // No confirmed city yet.
  await owner.confirm();
  const withTerrace = await forecast();
  expect(withTerrace.items[0]).toMatchObject({ quantity: 8.5, baselineQuantity: 10, observations: 4 });
  expect(withTerrace.ingredientNeeds[0].quantity).toBe(0.85);
  expect(withTerrace.weatherAdjustment).toMatchObject({ status: "applied", percent: -15, hasTerrace: true, weather: { weatherCode: 63 } });
  const purchase = (await purchases()).suggestions[0];
  expect(purchase.forecastNeed).toBe(0.85);
  expect(purchase.weatherAdjustments).toMatchObject([{ date: weatherDate, slot: "lunch", adjustment: { percent: -15 } }]);
  expect(provider.forecast).toHaveBeenCalledTimes(1);
  await terrace(false);
  const without = await forecast();
  expect(without.items[0].quantity).toBe(9.5);
  expect(without.forecastKey).not.toBe(withTerrace.forecastKey);
  const decisionInput = { operationId: randomUUID(), suggestionKey: purchase.suggestionKey, decision: "excluded" };
  const decisionUrl = `/api/workspace/orders/suggestions/${purchase.productId}/decision`;
  await owner.agent.post(decisionUrl).send(decisionInput).expect(409);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...plan, forecastKey: withTerrace.forecastKey }).expect(409);
  const draftInput = { ...plan, action: "save", forecastKey: without.forecastKey };
  const draft = (await owner.agent.post("/api/workspace/services/sheet").send(draftInput).expect(200)).body;
  expect(draft.forecastReference).toEqual(without);
  expect((await owner.agent.get("/api/workspace/services/sheet").query({ date: weatherDate, slot: "lunch" }).expect(200)).body.forecastReference).toEqual(without);
  const validInput = { ...plan, operationId: randomUUID(), expectedRevision: draft.revision, forecastKey: without.forecastKey };
  const saved = (await owner.agent.post("/api/workspace/services/sheet").send(validInput).expect(200)).body;
  expect(saved.forecastReference).toEqual(without);
  expect(saved.planned).toEqual(plan.planned); // Chef's ten portions, not forced to 9.5.
  const currentPurchase = (await purchases()).suggestions[0];
  const currentDecision = { ...decisionInput, suggestionKey: currentPurchase.suggestionKey };
  const purchaseDecision = (await owner.agent.post(decisionUrl).send(currentDecision).expect(201)).body;
  const snapshot = (await prisma.recommendationDecision.findUniqueOrThrow({ where: { id: purchaseDecision.id } })).snapshot;
  expect(snapshot).toMatchObject({ suggestion: { forecastNeed: 0.95, weatherAdjustments: [{ adjustment: { percent: -5, hasTerrace: false } }] } });
  await terrace(null);
  expect((await forecast()).items[0]).toMatchObject({ quantity: 10 });
  expect((await owner.agent.post("/api/workspace/services/sheet").send(validInput).expect(200)).body).toEqual(saved);
  await owner.agent.post(decisionUrl).send(currentDecision).expect(201);
  expect((await prisma.recommendationDecision.findUniqueOrThrow({ where: { id: purchaseDecision.id } })).snapshot).toEqual(snapshot);

  await terrace(true);
  vi.setSystemTime(new Date(`${weatherDate}T09:01:00Z`));
  const sunny = weatherForecast(); sunny.days![0].weatherCode = 0; provider.forecast.mockResolvedValueOnce(sunny);
  expect((await forecast()).items[0]).toMatchObject({ baselineQuantity: 10, quantity: 11 });
  vi.setSystemTime(new Date(`${weatherDate}T10:02:00Z`));
  provider.forecast.mockRejectedValueOnce(new WeatherProviderError("unavailable"));
  const stale = await forecast();
  expect(stale.items[0].quantity).toBe(10);
  expect(stale.weatherAdjustment?.status).toBe("not_applied");
  env.OPEN_METEO_MODE = "disabled"; provider.configured = false;
  expect((await forecast()).items[0].quantity).toBe(10);
  expect(await prisma.stockMovement.count({ where })).toBe(stockBefore);
  expect(await prisma.production.count({ where })).toBe(0);
  expect(await prisma.purchaseOrder.count({ where })).toBe(0);
  expect(await prisma.dailySale.count({ where })).toBe(4);
});
