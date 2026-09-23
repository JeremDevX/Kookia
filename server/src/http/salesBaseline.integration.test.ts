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

it("evaluates only complete recorded-sale history of the authenticated restaurant", async () => {
  const owner = await account();
  const other = await account();
  const complete = await owner.agent.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const incomplete = await owner.agent.post("/api/workspace/sales/items").send({ name: "Soupe" }).expect(201);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
    month: "2-digit", day: "2-digit" }).format(new Date());
  const asOf = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const date = (index: number) => new Date(Date.parse(asOf) + (index - 27) * 86_400_000);
  await prisma.dailySale.createMany({ data: Array.from({ length: 28 }, (_, index) => [
    { saleItemId: complete.body.id as string, quantity: 10, serviceDate: date(index) },
    ...(index === 10 ? [] : [{ saleItemId: incomplete.body.id as string, quantity: 2, serviceDate: date(index) }]),
  ]).flat().map((row) => ({ ...row, restaurantId: owner.restaurantId, source: "manual",
    operationId: randomUUID(), createdBy: owner.actorId, updatedBy: owner.actorId })) });
  const response = await owner.agent.get("/api/workspace/sales/baseline").expect(200);
  expect(response.body).toMatchObject({ provenance: "recorded_sales", status: "experimental",
    model: "rolling_mean_7_v1", asOfDate: asOf, forecastDate: today, observedItemCount: 2 });
  expect(response.body.items).toEqual([{ saleItemId: complete.body.id, saleItemName: "Pizza", forecastQuantity: 10,
    backtest: { from: new Date(Date.parse(asOf) - 6 * 86_400_000).toISOString().slice(0, 10),
      to: asOf, days: 7, meanAbsoluteError: 0, weightedAbsolutePercentageError: 0 } }]);
  expect((await other.agent.get("/api/workspace/sales/baseline").expect(200)).body).toMatchObject({ status: "no_data", items: [] });
  await request(app).get("/api/workspace/sales/baseline").expect(401);
});
