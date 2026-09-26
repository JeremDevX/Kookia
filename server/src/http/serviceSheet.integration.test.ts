import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Service sheet fixture",
    email: `service-sheet-${randomUUID()}@example.com`, password: "isolated sheet fixture password" }).expect(201);
  const actorId = result.body.user.id as string; users.push(actorId);
  const catalog = (await agent.get("/api/workspace/catalog").expect(200)).body;
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: actorId } });
  return { agent, actorId, restaurantId: restaurant.id, productId: catalog.products[0].id as string };
}

it("persists chef review separately from production, reconciles existing waste and preserves immutable closure", async () => {
  const owner = await account(), other = await account(), serviceDate = "2026-09-20", slot = "lunch";
  await request(app).get("/api/workspace/services/sheet").query({ date: serviceDate, slot }).expect(401);
  const recipe = (await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Plat fiche test", category: "Plat",
    prepTime: 20, yieldPortions: 10, effectiveFrom: serviceDate, ingredients: [{ productId: owner.productId, quantity: 1 }] }).expect(201)).body;
  const item = (await owner.agent.post("/api/workspace/sales/items").send({ name: "Plat fiche test" }).expect(201)).body;
  await owner.agent.post("/api/workspace/service-menu").send({ operationId: randomUUID(), expectedRevision: 0, serviceDate, slot,
    note: "Carte isolée", entries: [{ id: randomUUID(), name: "Plat fiche test", category: "Plat", saleItemId: item.id,
      available: true, priceCents: 1200, components: [{ recipeId: recipe.id, portions: 1 }] }] }).expect(201);
  const beforeMovements = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const input = { operationId: randomUUID(), expectedRevision: 0, serviceDate, slot, action: "save",
    planned: [{ recipeId: recipe.id, portions: 10 }], outcomes: [], substitutions: [], note: "Plan à revoir" };
  const draft = (await owner.agent.post("/api/workspace/services/sheet").send(input).expect(200)).body;
  expect(draft).toMatchObject({ revision: 1, state: "draft", validatedAt: null });
  const replay = (await owner.agent.post("/api/workspace/services/sheet").send(input).expect(200)).body;
  expect(replay).toEqual(draft);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...input, note: "Autre contenu" }).expect(409);
  expect((await other.agent.get("/api/workspace/services/sheet").query({ date: serviceDate, slot }).expect(200)).body)
    .toMatchObject({ revision: 0, state: "draft", planned: [] });
  await other.agent.post("/api/workspace/services/sheet").send({ ...input, operationId: randomUUID() }).expect(400);
  const validation = { ...input, operationId: randomUUID(), expectedRevision: 1, action: "validate_plan" };
  const reviewed = (await owner.agent.post("/api/workspace/services/sheet").send(validation).expect(200)).body;
  expect(reviewed).toMatchObject({ state: "validated", revision: 2, validatedBy: owner.actorId });
  expect(await prisma.production.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(beforeMovements);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...validation, operationId: randomUUID(), expectedRevision: 2,
    action: "save", planned: [{ recipeId: recipe.id, portions: 12 }] }).expect(409);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...validation, operationId: randomUUID(), expectedRevision: 2, action: "close" }).expect(409);
  // Facts belong only to this temporary fixture; no operational account is used.
  const version = await prisma.recipeVersion.findFirstOrThrow({ where: { restaurantId: owner.restaurantId, recipeId: recipe.id } });
  const production = await prisma.production.create({ data: { restaurantId: owner.restaurantId, recipeId: recipe.id,
    recipeVersionId: version.id, recipeName: recipe.name, portions: 10, prepTime: 20, notes: "Fixture",
    date: new Date(`${serviceDate}T00:00:00Z`), serviceSlot: slot, kind: "production", actorId: owner.actorId, operationId: randomUUID() } });
  const sale = (await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: item.id, serviceDate, quantity: 7 }).expect(201)).body;
  await owner.agent.put(`/api/workspace/sales/${sale.id}/services`).send({ lunchQuantity: 7, dinnerQuantity: 0, expectedRevision: 0, expectedSaleRevision: 0 }).expect(200);
  await owner.agent.put("/api/workspace/services/calendar").send({ serviceDate, slot, plannedOpen: true, coverage: "complete", actualCovers: 7, note: "Ventes revues", expectedRevision: 0 }).expect(200);
  const refund = { expectedRevision: 0, operationId: randomUUID(), reason: "Remboursement monétaire isolé" };
  await owner.agent.post(`/api/workspace/sales/${sale.id}/refund`).send(refund).expect(200);
  await owner.agent.post(`/api/workspace/sales/${sale.id}/refund`).send(refund).expect(200);
  const dinner = (await owner.agent.get("/api/workspace/services/sheet").query({ date: serviceDate, slot: "dinner" }).expect(200)).body;
  expect(dinner.facts.dailyRefunds).toHaveLength(1);
  expect(dinner.facts.dailyRefunds[0]).toMatchObject({ saleId: sale.id, serviceDate, serviceSlot: null, amount: null });
  const closeInput = { ...validation, operationId: randomUUID(), action: "close", expectedRevision: 2,
    outcomes: [{ recipeId: recipe.id, retained: 1, discarded: 2, note: "Conservation revue" }] };
  await owner.agent.post("/api/workspace/services/sheet").send(closeInput).expect(409);
  await owner.agent.post("/api/workspace/waste").send({ operationId: randomUUID(), serviceDate, serviceSlot: slot,
    kind: "unsold", avoidability: "avoidable", productionId: production.id, quantity: 2, unit: "portion", note: "Invendu écarté" }).expect(201);
  const closed = (await owner.agent.post("/api/workspace/services/sheet").send(closeInput).expect(200)).body;
  expect(closed).toMatchObject({ state: "closed", revision: 3, factsChangedSinceClosure: false });
  expect(closed.closureFacts.lines).toContainEqual(expect.objectContaining({ recipeId: recipe.id, prepared: 10, sold: 7, unsold: 3, retained: 1, discarded: 2, unexplained: 0 }));
  expect(closed.closureFacts.dailyRefunds).toHaveLength(1);
  expect(await prisma.wasteRecord.count({ where: { restaurantId: owner.restaurantId } })).toBe(1);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(beforeMovements);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...closeInput, operationId: randomUUID(), expectedRevision: 3, action: "save" }).expect(409);
  await owner.agent.post(`/api/workspace/sales/${sale.id}/refund`).send({ ...refund, operationId: randomUUID(), reason: "Signalement après clôture" }).expect(200);
  const afterRefund = (await owner.agent.get("/api/workspace/services/sheet").query({ date: serviceDate, slot }).expect(200)).body;
  expect(afterRefund.factsChangedSinceClosure).toBe(true);
  expect(afterRefund.closureFacts.dailyRefunds).toHaveLength(1);
  expect(afterRefund.facts.dailyRefunds).toHaveLength(2);
  expect(afterRefund.facts.lines[0].sold).toBe(7);
  await owner.agent.patch(`/api/workspace/sales/${sale.id}`).send({ saleItemId: item.id, serviceDate, quantity: 8, revision: 0,
    operationId: randomUUID(), reason: "Correction post-clôture isolée" }).expect(200);
  const reread = (await owner.agent.get("/api/workspace/services/sheet").query({ date: serviceDate, slot }).expect(200)).body;
  expect(reread.factsChangedSinceClosure).toBe(true);
  expect(reread.closureFacts).toEqual(closed.closureFacts);
  expect(reread.facts.lines[0].sold).toBeNull();
  expect((await owner.agent.post("/api/workspace/services/sheet").send(closeInput).expect(200)).body).toEqual(closed);
});

it("captures server forecast provenance and rejects a stale forecast key", async () => {
  const owner = await account();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const offset = (day: string, count: number) => new Date(Date.parse(day) + count * 86400000).toISOString().slice(0, 10);
  const serviceDate = offset(today, 7), slot = "lunch";
  const recipe = (await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Prévision fiche", category: "Plat",
    prepTime: 10, yieldPortions: 10, effectiveFrom: "2026-01-01", ingredients: [{ productId: owner.productId, quantity: 1 }] }).expect(201)).body;
  const item = (await owner.agent.post("/api/workspace/sales/items").send({ name: "Prévision fiche" }).expect(201)).body;
  const menuInput = { operationId: randomUUID(), expectedRevision: 0, serviceDate, slot, note: "Prévision",
    entries: [{ id: randomUUID(), name: "Prévision fiche", category: "Plat", saleItemId: item.id, available: true,
      priceCents: 1200, components: [{ recipeId: recipe.id, portions: 1 }] }] };
  const menu = (await owner.agent.post("/api/workspace/service-menu").send(menuInput).expect(201)).body;
  await owner.agent.put("/api/workspace/services/calendar").send({ serviceDate, slot, plannedOpen: true, coverage: "missing", actualCovers: null, note: "Planifié", expectedRevision: 0 }).expect(200);
  for (const weeks of [2, 3, 4, 5]) {
    const historicalDate = new Date(`${offset(serviceDate, -7 * weeks)}T00:00:00Z`);
    await prisma.restaurantServiceSession.create({ data: { restaurantId: owner.restaurantId, serviceDate: historicalDate, slot,
      plannedOpen: true, coverage: "complete", actualCovers: 10, actorId: owner.actorId } });
    await prisma.serviceDay.create({ data: { restaurantId: owner.restaurantId, serviceDate: historicalDate, status: "open", coverage: "complete", actorId: owner.actorId } });
    const sale = await prisma.dailySale.create({ data: { restaurantId: owner.restaurantId, serviceDate: historicalDate, saleItemId: item.id,
      quantity: 10, source: "manual", operationId: randomUUID(), createdBy: owner.actorId, updatedBy: owner.actorId } });
    await prisma.saleServiceAllocation.create({ data: { restaurantId: owner.restaurantId, saleId: sale.id, lunchQuantity: 10, dinnerQuantity: 0, saleRevision: 0, actorId: owner.actorId } });
    await prisma.serviceMenuVersion.create({ data: { restaurantId: owner.restaurantId, serviceDate: historicalDate, slot,
      revision: 1, operationId: randomUUID(), actorId: owner.actorId, note: "Historique fixture", entries: menu.entries } });
  }
  const forecast = (await owner.agent.get("/api/workspace/service-forecast").query({ from: serviceDate, to: serviceDate }).expect(200)).body;
  const forecastService = forecast.services.find((service: { slot: string }) => service.slot === slot);
  expect(forecastService.items[0]).toMatchObject({ quantity: 10, observations: 4 });
  const input = { operationId: randomUUID(), expectedRevision: 0, serviceDate, slot, action: "save", forecastKey: forecastService.forecastKey,
    planned: [{ recipeId: recipe.id, portions: 11 }], outcomes: [], substitutions: [], note: "Chef ajuste l’estimation" };
  const draft = (await owner.agent.post("/api/workspace/services/sheet").send(input).expect(200)).body;
  await owner.agent.post("/api/workspace/service-menu").send({ ...menuInput, operationId: randomUUID(), expectedRevision: 1, note: "Carte revue" }).expect(201);
  await owner.agent.post("/api/workspace/services/sheet").send({ ...input, operationId: randomUUID(), expectedRevision: draft.revision, action: "validate_plan" }).expect(409)
    .then(result => expect(result.body.error.code).toBe("FORECAST_CHANGED"));
  const updated = (await owner.agent.get("/api/workspace/service-forecast").query({ from: serviceDate, to: serviceDate }).expect(200)).body;
  const reference = updated.services.find((service: { slot: string }) => service.slot === slot);
  const validated = (await owner.agent.post("/api/workspace/services/sheet").send({ ...input, operationId: randomUUID(), expectedRevision: draft.revision,
    forecastKey: reference.forecastKey, action: "validate_plan" }).expect(200)).body;
  expect(validated.forecastReference).toEqual(reference);
  expect(validated.planned).toEqual([{ recipeId: recipe.id, portions: 11 }]);
  expect(await prisma.production.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
});

it("closes fractional formula portions using confirmed fractional conservation and existing portion waste", async () => {
  const owner = await account(), serviceDate = "2026-09-20", slot = "lunch";
  const recipe = (await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Demi-portion fiche", category: "Plat",
    prepTime: 10, yieldPortions: 1, effectiveFrom: serviceDate, ingredients: [{ productId: owner.productId, quantity: .1 }] }).expect(201)).body;
  const item = (await owner.agent.post("/api/workspace/sales/items").send({ name: "Formule demi-portion" }).expect(201)).body;
  await owner.agent.post("/api/workspace/service-menu").send({ operationId: randomUUID(), expectedRevision: 0, serviceDate, slot,
    note: "Formule partielle", entries: [{ id: randomUUID(), name: "Formule demi-portion", category: "Formule", saleItemId: item.id,
      available: true, priceCents: 600, components: [{ recipeId: recipe.id, portions: .5 }] }] }).expect(201);
  const plan = { operationId: randomUUID(), expectedRevision: 0, serviceDate, slot, action: "validate_plan",
    planned: [{ recipeId: recipe.id, portions: 2 }], outcomes: [], substitutions: [], note: "Chef valide deux portions" };
  await owner.agent.post("/api/workspace/services/sheet").send(plan).expect(200);
  const version = await prisma.recipeVersion.findFirstOrThrow({ where: { restaurantId: owner.restaurantId, recipeId: recipe.id } });
  const production = await prisma.production.create({ data: { restaurantId: owner.restaurantId, recipeId: recipe.id,
    recipeVersionId: version.id, recipeName: recipe.name, portions: 2, prepTime: 10, notes: "Fixture portions partielles",
    date: new Date(`${serviceDate}T00:00:00Z`), serviceSlot: slot, kind: "production", actorId: owner.actorId, operationId: randomUUID() } });
  const beforeMovements = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const sale = (await owner.agent.post("/api/workspace/sales").send({ operationId: randomUUID(), saleItemId: item.id, serviceDate, quantity: 1 }).expect(201)).body;
  await owner.agent.put(`/api/workspace/sales/${sale.id}/services`).send({ lunchQuantity: 1, dinnerQuantity: 0, expectedRevision: 0, expectedSaleRevision: 0 }).expect(200);
  await owner.agent.put("/api/workspace/services/calendar").send({ serviceDate, slot, plannedOpen: true, coverage: "complete", actualCovers: 1, note: "Revue", expectedRevision: 0 }).expect(200);
  for (const quantity of [.1, .2]) await owner.agent.post("/api/workspace/waste").send({ operationId: randomUUID(), serviceDate, serviceSlot: slot,
    kind: "unsold", avoidability: "avoidable", productionId: production.id, quantity, unit: "portion", note: "Portion partielle écartée" }).expect(201);
  const close = { ...plan, operationId: randomUUID(), expectedRevision: 1, action: "close",
    outcomes: [{ recipeId: recipe.id, retained: 1.2, discarded: .3, note: "Rapprochement confirmé" }] };
  await owner.agent.post("/api/workspace/services/sheet").send({ ...close, outcomes: [{ ...close.outcomes[0], retained: 1.2001 }] }).expect(400);
  const result = (await owner.agent.post("/api/workspace/services/sheet").send(close).expect(200)).body;
  expect(result.state).toBe("closed");
  expect(result.closureFacts.lines[0]).toMatchObject({ prepared: 2, sold: .5, unsold: 1.5, retained: 1.2, discarded: .3, recordedUnsoldWaste: .3, unexplained: 0 });
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(beforeMovements);
});
