import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: `${label} replay fixture`, email: `${label}-${randomUUID()}@example.com`,
    password: "timeline replay fixture password",
  }).expect(201);
  users.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: response.body.user.id }, include: { restaurant: true },
  });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id };
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

it("replays an isolated purchase decision idempotently without changing current stock or orders", async () => {
  const owner = await account("timeline-replay-owner");
  const other = await account("timeline-replay-other");
  await prisma.restaurant.update({ where: { id: owner.restaurantId }, data: { mode: "demo" } });
  const decisionId = randomUUID();
  const day = localDate();
  const key = "a".repeat(64);
  await prisma.recommendationDecision.create({ data: {
    id: decisionId, restaurantId: owner.restaurantId, actorId: owner.userId, operationId: randomUUID(),
    decision: "purchase_suggestion_added", createdAt: new Date(`${day}T12:00:00.000Z`), snapshot: {
      suggestionKey: key, productId: "p1", quantity: 2,
      provenance: "demo_simulation", workspaceMode: "demo", model: "fixture-baseline-v1",
      asOfDate: day, forecastDate: day,
      suggestion: { suggestionKey: key, productId: "p1", productName: "Farine T55", unit: "kg",
        status: "ready", canAdd: true, forecastNeed: 4, countedStock: 0, countDate: day,
        estimatedQuantity: 4, currentUnitPrice: 3.25, estimatedCost: 13, reason: "Besoin de démonstration.",
        supplierName: "Fournisseur fictif", sources: [], decision: null },
    },
  } });

  const before = {
    products: await prisma.product.findMany({ where: { restaurantId: owner.restaurantId },
      select: { id: true, currentStock: true, stockRevision: true } }),
    movements: await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } }),
    orders: await prisma.purchaseOrder.count({ where: { restaurantId: owner.restaurantId } }),
    receipts: await prisma.purchaseReceipt.count({ where: { restaurantId: owner.restaurantId } }),
  };
  const timeline = await owner.agent.get("/api/workspace/timeline").query({ from: day, to: day, asOf: day }).expect(200);
  expect(timeline.body.events).toContainEqual(expect.objectContaining({
    id: `decision:${decisionId}`, replayDecisionId: decisionId,
  }));

  const payload = { decisionId };
  const replay = await owner.agent.post("/api/workspace/timeline/replays").send(payload).expect(201);
  expect(replay.body).toMatchObject({ id: decisionId, sourceDecisionId: decisionId,
    sandboxOutcome: { kind: "draft_line", quantity: 2, estimatedCost: 6.5 }, revision: 1 });
  const concurrentReplays = await Promise.all([1, 2, 3].map(() =>
    owner.agent.post("/api/workspace/timeline/replays").send(payload)));
  expect(concurrentReplays.map((response) => response.status)).toEqual([201, 201, 201]);
  expect(concurrentReplays.map((response) => response.body)).toEqual([replay.body, replay.body, replay.body]);
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: owner.restaurantId,
    kind: { startsWith: "timeline-replay:v1:" } } })).toBe(1);
  await owner.agent.get(`/api/workspace/timeline/replays/${decisionId}`).expect(200).then(({ body }) =>
    expect(body).toEqual(replay.body));
  await other.agent.post("/api/workspace/timeline/replays").send(payload).expect(404);
  await other.agent.get(`/api/workspace/timeline/replays/${decisionId}`).expect(404);

  const after = {
    products: await prisma.product.findMany({ where: { restaurantId: owner.restaurantId },
      select: { id: true, currentStock: true, stockRevision: true } }),
    movements: await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } }),
    orders: await prisma.purchaseOrder.count({ where: { restaurantId: owner.restaurantId } }),
    receipts: await prisma.purchaseReceipt.count({ where: { restaurantId: owner.restaurantId } }),
  };
  expect(after).toEqual(before);
});
