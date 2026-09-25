import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Baseline test",
    email: `baseline-${randomUUID()}@example.com`, password: "baseline test password" }).expect(201);
  ids.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, actorId: result.body.user.id as string, restaurantId: restaurant.id };
}

it("requires complete calendar coverage and treats absent item rows as zero only on reviewed days", async () => {
  const owner = await account();
  const other = await account();
  const complete = await owner.agent.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const incomplete = await owner.agent.post("/api/workspace/sales/items").send({ name: "Soupe" }).expect(201);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
    month: "2-digit", day: "2-digit" }).format(new Date());
  const asOf = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const date = (index: number) => new Date(Date.parse(asOf) + (index - 27) * 86_400_000);
  await prisma.serviceDay.createMany({ data: Array.from({ length: 28 }, (_, index) => ({
    restaurantId: owner.restaurantId, serviceDate: date(index), status: "open", coverage: "complete",
    actorId: owner.actorId,
  })) });
  await prisma.dailySale.createMany({ data: Array.from({ length: 28 }, (_, index) => [
    { saleItemId: complete.body.id as string, quantity: 10, serviceDate: date(index) },
    ...(index === 10 ? [] : [{ saleItemId: incomplete.body.id as string, quantity: 2, serviceDate: date(index) }]),
  ]).flat().map((row) => ({ ...row, restaurantId: owner.restaurantId, source: "manual",
    operationId: randomUUID(), createdBy: owner.actorId, updatedBy: owner.actorId })) });
  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const recipe = await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(),
    name: "Pizza baseline versionnée", category: "Plat", prepTime: 12, yieldPortions: 4,
    effectiveFrom: date(0).toISOString().slice(0, 10),
    ingredients: [{ productId: catalog.body.products[0].id, quantity: 2 }] }).expect(201);
  await owner.agent.post("/api/workspace/sales/recipe-mappings").send({ saleItemId: complete.body.id,
    recipeId: recipe.body.id, expectedRevision: 0, operationId: randomUUID(),
    effectiveFrom: date(0).toISOString().slice(0, 10), portionsPerItem: 2 }).expect(201);
  const recipeRevision = await owner.agent.patch(`/api/workspace/recipes/${recipe.body.id}`).send({
    operationId: randomUUID(), expectedRevision: 1, name: "Pizza baseline version 2", category: "Plat",
    prepTime: 12, yieldPortions: 4, effectiveFrom: date(24).toISOString().slice(0, 10),
    ingredients: [{ productId: catalog.body.products[0].id, quantity: 8 }],
  }).expect(200);
  expect(recipeRevision.body.version).toBe(2);
  const response = await owner.agent.get("/api/workspace/sales/baseline").expect(200);
  expect(response.body).toMatchObject({ provenance: "recorded_sales", status: "experimental",
    model: "rolling_mean_7_v1", asOfDate: asOf, forecastDate: today, observedItemCount: 2,
    contextualForecast: { status: "not_connected", position: "unverified", weather: "not_connected",
      events: "not_connected", historicalEmissions: "not_connected", forecastSource: "f1",
      contextualAdjustmentApplied: false } });
  expect(response.body.items.map((item: { saleItemId: string; forecastQuantity: number }) =>
    [item.saleItemId, item.forecastQuantity])).toEqual([[complete.body.id, 10], [incomplete.body.id, 2]]);
  const pizzaBaseline = response.body.items.find((item: { saleItemId: string }) => item.saleItemId === complete.body.id);
  expect(pizzaBaseline.backtest).toMatchObject({ days: 7, observedQuantity: 70,
    rollingMean7: { meanAbsoluteError: 0, weightedAbsolutePercentageError: 0 },
    previousWeekday: { meanAbsoluteError: 0, weightedAbsolutePercentageError: 0 } });
  expect(pizzaBaseline.recipeProjection).toMatchObject({ status: "mapped", recipeId: recipe.body.id, recipeVersion: 2,
    mappingRevision: 1, recipeEffectiveFrom: date(24).toISOString().slice(0, 10), forecastPortions: 20,
    ingredients: [{ productId: catalog.body.products[0].id, quantity: 40 }] });
  expect(pizzaBaseline.recipeBacktest).toMatchObject({ mappedDays: 0, missingMappingDays: 7,
    missingDatedRecipeDays: 0, versionsUsed: [], ingredients: [] });
  await prisma.serviceDay.update({ where: { restaurantId_serviceDate: {
    restaurantId: owner.restaurantId, serviceDate: date(10),
  } }, data: { coverage: "partial" } });
  expect((await owner.agent.get("/api/workspace/sales/baseline").expect(200)).body)
    .toMatchObject({ status: "insufficient_history", completeServiceDays: 27, items: [],
      contextualForecast: { forecastSource: "none", contextualAdjustmentApplied: false } });
  expect((await other.agent.get("/api/workspace/sales/baseline").expect(200)).body)
    .toMatchObject({ status: "no_data", items: [], completeServiceDays: 0, incompleteDates: expect.any(Array),
      contextualForecast: { forecastSource: "none", contextualAdjustmentApplied: false } });
  await request(app).get("/api/workspace/sales/baseline").expect(401);
});
