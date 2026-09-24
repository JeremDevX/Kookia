import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { syncPosSales } from "../application/workspace/posSalesSyncService.js";
import type { PosAdapter, PosSalesBatch } from "../integrations/posAdapter.js";
import { prisma } from "../infrastructure/database/prisma.js";

const userIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: userIds } } }); await prisma.$disconnect(); });

async function account() {
  const agent = request.agent(app);
  const registration = await agent.post("/api/auth/register").send({ displayName: "POS fixture test",
    email: `pos-${randomUUID()}@example.com`, password: "pos integration password" }).expect(201);
  userIds.push(registration.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: registration.body.user.id } });
  return { agent, restaurantId: restaurant.id, actorId: registration.body.user.id as string };
}

it("resumes bounded fixture batches, requires POS review, saves mappings and excludes simulated rows from real totals", async () => {
  const owner = await account();
  const other = await account();
  const pizza = await owner.agent.post("/api/workspace/sales/items").send({ name: "Pizza" }).expect(201);
  const soup = await owner.agent.post("/api/workspace/sales/items").send({ name: "Soupe" }).expect(201);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const serviceDate = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const window = { from: serviceDate, to: serviceDate };
  const outsideWindow = { from: new Date(Date.parse(today) - 40 * 86_400_000).toISOString().slice(0, 10), to: today };
  const firstBatch: PosSalesBatch = { batchId: "fixture-page-one", nextCursor: "cursor-page-two", coverage: "partial", records: [
    { sourceRecordId: "pizza-sale-1", revision: 1, serviceDate, externalItemId: "pizza-code", itemLabel: "Pizza", quantity: 5, refunded: false },
    { sourceRecordId: "unknown-sale-1", revision: 1, serviceDate, externalItemId: "dessert-code", itemLabel: "Dessert du jour", quantity: 2, refunded: false },
    { sourceRecordId: "refund-1", revision: 1, serviceDate, externalItemId: "refund-code", itemLabel: "Plat remboursé", quantity: 1, refunded: true },
  ] };
  const secondBatch: PosSalesBatch = { batchId: "fixture-page-two", nextCursor: null, coverage: "complete", records: [
    firstBatch.records[0],
    { sourceRecordId: "unknown-sale-2", revision: 1, serviceDate, externalItemId: "dessert-code", itemLabel: "Dessert du jour", quantity: 3, refunded: false },
  ] };
  let mode: "offline" | "page-one" | "page-two" = "offline";
  const requests: Array<{ restaurantId: string; cursor: string | null }> = [];
  const adapter: PosAdapter = { provider: "fixture_pos", provenance: "demo_simulation", async read(restaurantId, query) {
    requests.push({ restaurantId, cursor: query.cursor });
    if (mode === "offline") return { status: "unavailable", reason: "temporary_error" };
    return { status: "ok", payload: mode === "page-one" ? firstBatch : secondBatch };
  } };

  await expect(syncPosSales(owner.restaurantId, owner.actorId, outsideWindow, adapter))
    .rejects.toMatchObject({ code: "INVALID_POS_WINDOW" });
  expect(requests).toHaveLength(0);
  expect(await syncPosSales(owner.restaurantId, owner.actorId, window, adapter)).toMatchObject({ status: "unavailable", reason: "temporary_error" });
  expect(await prisma.posSyncState.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);

  mode = "page-one";
  const imported = await syncPosSales(owner.restaurantId, owner.actorId, window, adapter);
  expect(imported).toMatchObject({ status: "ok", coverage: "partial", provenance: "demo_simulation",
    recordCount: 3, candidateCount: 3, duplicateRecords: 0, replayed: false, nextCursor: "cursor-page-two" });
  await expect(syncPosSales(owner.restaurantId, owner.actorId, {
    from: new Date(Date.parse(serviceDate) - 86_400_000).toISOString().slice(0, 10), to: serviceDate,
  }, adapter)).rejects.toMatchObject({ code: "POS_WINDOW_CONFLICT" });
  expect(requests.filter((entry) => entry.restaurantId === owner.restaurantId)).toHaveLength(2);
  const retries = await Promise.all([
    syncPosSales(owner.restaurantId, owner.actorId, window, adapter),
    syncPosSales(owner.restaurantId, owner.actorId, window, adapter),
  ]);
  expect(retries.map((result) => result.status === "ok" && result.replayed)).toEqual([true, true]);
  expect((await prisma.posSyncState.findUniqueOrThrow({ where: { restaurantId_provider: {
    restaurantId: owner.restaurantId, provider: adapter.provider,
  } } })).cursor).toBe("cursor-page-two");
  expect((await owner.agent.get(`/api/workspace/sales?from=${serviceDate}&to=${serviceDate}`).expect(200)).body).toEqual([]);

  let contributions = (await owner.agent.get(`/api/workspace/sales/contributions?from=${serviceDate}&to=${serviceDate}`).expect(200)).body;
  expect(contributions).toHaveLength(3);
  const unmapped = contributions.find((row: { sourceExternalItemId: string }) => row.sourceExternalItemId === "dessert-code");
  const refund = contributions.find((row: { sourceRefunded: boolean }) => row.sourceRefunded);
  expect(unmapped).toMatchObject({ source: "demo_simulation", saleItemId: null, quantity: 2,
    posBatch: { coverage: "partial", provenance: "demo_simulation" }, status: "pending" });
  expect(refund).toMatchObject({ sourceRefunded: true, quantity: null, status: "pending" });
  await owner.agent.post(`/api/workspace/sales/contributions/${refund.id}/review`).send({ expectedRevision: 0,
    decision: "replace", operationId: randomUUID(), reason: "Un remboursement ne devient pas une vente." }).expect(409);
  await owner.agent.post(`/api/workspace/sales/contributions/${refund.id}/review`).send({ expectedRevision: 0,
    decision: "reject", operationId: randomUUID(), reason: "Remboursement conservé hors unités vendues." }).expect(200);
  await owner.agent.post(`/api/workspace/sales/contributions/${unmapped.id}/review`).send({ expectedRevision: 0,
    decision: "replace", operationId: randomUUID(), saleItemId: soup.body.id,
    reason: "Article caisse associé à Soupe après vérification." }).expect(200);
  expect(await prisma.posArticleMapping.findUnique({ where: { restaurantId_provider_externalItemId: {
    restaurantId: owner.restaurantId, provider: adapter.provider, externalItemId: "dessert-code",
  } } })).toMatchObject({ saleItemId: soup.body.id, actorId: owner.actorId });
  expect(await prisma.dailySale.findMany({ where: { restaurantId: owner.restaurantId } })).toMatchObject([
    { saleItemId: soup.body.id, serviceDate: new Date(`${serviceDate}T00:00:00.000Z`), quantity: 2, source: "demo_simulation" },
  ]);
  const salad = await owner.agent.post("/api/workspace/sales/items").send({ name: "Salade" }).expect(201);
  await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: salad.body.id,
    serviceDate, quantity: 1 }).expect(201);
  const dayBeforeReview = await owner.agent.get(`/api/workspace/sales/service-days?from=${serviceDate}&to=${serviceDate}`).expect(200);
  expect(dayBeforeReview.body).toMatchObject([{ coverage: "partial", source: "mixed" }]);

  mode = "page-two";
  const continued = await syncPosSales(owner.restaurantId, owner.actorId, window, adapter);
  expect(continued).toMatchObject({ status: "ok", coverage: "complete", recordCount: 2,
    candidateCount: 1, duplicateRecords: 1, nextCursor: null, replayed: false });
  expect(requests.at(-1)).toEqual({ restaurantId: owner.restaurantId, cursor: "cursor-page-two" });
  contributions = (await owner.agent.get(`/api/workspace/sales/contributions?from=${serviceDate}&to=${serviceDate}`).expect(200)).body;
  const mappedDuplicate = contributions.find((row: { sourceRecordId: string }) => row.sourceRecordId === "unknown-sale-2");
  expect(mappedDuplicate).toMatchObject({ saleItemId: soup.body.id, currentSale: { quantity: 2 }, posBatch: { coverage: "complete" } });
  const completedBatchDay = (await owner.agent.get(`/api/workspace/sales/service-days?from=${serviceDate}&to=${serviceDate}`).expect(200)).body[0];
  expect(completedBatchDay.coverage).toBe("partial");
  await owner.agent.post(`/api/workspace/sales/contributions/${mappedDuplicate.id}/review`).send({ expectedRevision: 0,
    decision: "keep", operationId: randomUUID(), saleItemId: soup.body.id,
    reason: "La première vente confirmée est conservée." }).expect(200);
  const completedByOwner = await owner.agent.put(`/api/workspace/sales/service-days/${serviceDate}`).send({
    expectedRevision: completedBatchDay.revision, status: "open", coverage: "complete",
  }).expect(200);
  expect(completedByOwner.body).toMatchObject({ coverage: "complete", source: "mixed" });
  expect((await owner.agent.get(`/api/workspace/sales/metrics?from=${serviceDate}&to=${serviceDate}`).expect(200)).body)
    .toMatchObject({ status: "insufficient_history", totalQuantity: 3, manualQuantity: 1, posQuantity: 0,
      demoSimulationQuantity: 2, completeServiceDays: 1 });
  expect((await owner.agent.get("/api/workspace/sales/baseline").expect(200)).body)
    .toMatchObject({ provenance: "mixed", excludedSimulationRows: 1, mixedSourceWindow: true, items: [] });

  const emptyOtherAdapter: PosAdapter = { ...adapter, async read(restaurantId, query) {
    requests.push({ restaurantId, cursor: query.cursor });
    return { status: "ok", payload: { batchId: "other-tenant-empty", nextCursor: null, coverage: "complete", records: [] } };
  } };
  const otherResult = await syncPosSales(other.restaurantId, other.actorId, window, emptyOtherAdapter);
  expect(otherResult).toMatchObject({ status: "ok", recordCount: 0, candidateCount: 0 });
  expect((await other.agent.get(`/api/workspace/sales/contributions?from=${serviceDate}&to=${serviceDate}`).expect(200)).body).toEqual([]);
  expect(await prisma.saleContribution.count({ where: { restaurantId: other.restaurantId } })).toBe(0);
  expect((await owner.agent.get("/api/workspace/sources").expect(200)).body.sources.find((source: { kind: string }) => source.kind === "pos"))
    .toMatchObject({ state: "not_connected", lastSuccessAt: null });
  await owner.agent.post("/api/workspace/sales/pos/sync").send(window).expect(503).expect(({ body }) =>
    expect(body).toEqual({ status: "not_connected", reason: "not_configured" }));
  await request(app).post("/api/workspace/sales/pos/sync").send(window).expect(401);
  const manualFallback = await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(),
    saleItemId: pizza.body.id, serviceDate, quantity: 1 }).expect(201);
  expect(manualFallback.body).toMatchObject({ source: "manual", saleItemId: pizza.body.id, quantity: 1 });
});
