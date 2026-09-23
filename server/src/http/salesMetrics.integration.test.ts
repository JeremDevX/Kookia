import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({
    displayName: "Sales metrics test", email: `sales-metrics-${randomUUID()}@example.com`, password: "sales metrics test password",
  }).expect(201);
  ids.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, actorId: result.body.user.id as string, restaurantId: restaurant.id };
}

it("computes recorded-sale metrics in the tenant and selected periods only", async () => {
  const owner = await account();
  const other = await account();
  const item = await owner.agent.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const itemId = item.body.id as string;
  const makeRow = (serviceDate: string, quantity: number, source: string, revision = 0) => ({
    restaurantId: owner.restaurantId, saleItemId: itemId, serviceDate: new Date(`${serviceDate}T00:00:00Z`),
    quantity, source, revision, operationId: randomUUID(), createdBy: owner.actorId, updatedBy: owner.actorId,
  });
  await prisma.dailySale.createMany({ data: [
    ...Array.from({ length: 7 }, (_, index) => makeRow(`2026-08-${25 + index}`, 2, "manual")),
    ...Array.from({ length: 7 }, (_, index) => makeRow(`2026-09-0${index + 1}`, 4, index === 0 ? "csv" : "manual", index === 0 ? 1 : 0)),
  ] });
  await owner.agent.get("/api/workspace/sales/metrics?from=2026-09-01&to=2026-09-14").expect(200).then(({ body }) => {
    expect(body).toMatchObject({ provenance: "recorded_sales", status: "ready", observedDays: 7,
      previousObservedDays: 7, totalQuantity: 28, manualQuantity: 24, csvQuantity: 4,
      correctedCsvQuantity: 4, averagePerObservedDay: 4, previousAveragePerObservedDay: 2, changePercent: 100 });
    expect(body.dailyItems).toHaveLength(7);
    expect(body.dailyItems[0]).toMatchObject({ serviceDate: "2026-09-07", saleItemId: itemId, quantity: 4 });
    expect(body.items).toEqual([{ saleItemId: itemId, saleItemName: "Pizza", quantity: 28 }]);
  });
  expect((await other.agent.get("/api/workspace/sales/metrics?from=2026-09-01&to=2026-09-14").expect(200)).body.status).toBe("no_data");
  expect((await owner.agent.get("/api/workspace/sales/metrics?from=2026-09-10&to=2026-09-14").expect(200)).body.status).toBe("no_data");
  expect((await owner.agent.get("/api/workspace/sales/metrics?from=2026-09-01&to=2026-09-04").expect(200)).body.status).toBe("insufficient_history");
  await owner.agent.get("/api/workspace/sales/metrics?from=2026-09-30&to=2026-09-01").expect(400);
  await request(app).get("/api/workspace/sales/metrics").expect(401);
});
