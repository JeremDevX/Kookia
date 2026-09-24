import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { applyRestaurantSimulation } from "../scripts/restaurantSimulationStorage.js";
import { buildRecipePlan } from "../scripts/restaurantSimulationSupport.js";
import { createAnonymizedSourceInvoices } from "../scripts/fixtures/anonymizedSourceInvoices.js";
import { buildRestaurantSimulation } from "../scripts/restaurantSimulationPlan.js";

const users: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

async function account(label: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    displayName: `${label} fixture`, email: `${label}-${randomUUID()}@example.com`,
    password: "scenario fixture password",
  }).expect(201);
  users.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: response.body.user.id }, include: { restaurant: true },
  });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id };
}

function sourceDocument(invoice: ReturnType<typeof createAnonymizedSourceInvoices>[number]): Prisma.InputJsonObject {
  const stockLines: Prisma.InputJsonValue[] = invoice.stockLines.map((line) => ({
    name: line.name, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice,
    sourceQuantityText: line.sourceQuantityText, sourceLineNumber: line.sourceLineNumber,
    priceBasis: line.priceBasis, priceTaxBasis: line.priceTaxBasis,
    ...(line.code ? { code: line.code } : {}),
  }));
  return {
    id: invoice.id, contentHash: invoice.contentHash, title: invoice.title, date: invoice.date ?? null, originalDate: invoice.originalDate ?? null,
    supplier: invoice.supplier, type: invoice.type, status: invoice.status, content: invoice.content,
    stockLines,
  };
}

async function upsertSourceDocument(restaurantId: string, invoice: ReturnType<typeof createAnonymizedSourceInvoices>[number]) {
  await prisma.workspaceDocument.upsert({
    where: { restaurantId_kind: { restaurantId, kind: `source-invoice:${invoice.id}` } },
    create: { restaurantId, kind: `source-invoice:${invoice.id}`, data: sourceDocument(invoice) },
    update: { data: sourceDocument(invoice) },
  });
}

async function applyFixtureReceipt(restaurantId: string, productId: string, sourceId: string, delta: number) {
  const operationId = `restaurant-simulation-v1:invoice:${sourceId}:${productId}`;
  // Exercise repeatable fixture seeding without invoking any retained-data writer.
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId} AND id = ${productId} FOR UPDATE
    `);
    if (!locked.length) throw new Error("Le produit de fixture n'existe pas.");

    const prior = await tx.stockMovement.findUnique({
      where: { restaurantId_operationId_productId: { restaurantId, operationId, productId } },
    });
    if (prior) {
      if (!prior.delta.equals(delta) || prior.reason !== "invoice_import_demo" || prior.actorId !== "restaurant-simulation:v1") {
        throw new Error("Le rejeu de fixture a réutilisé l'identité avec d'autres valeurs.");
      }
      return;
    }

    const product = await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: productId } },
      include: { supplier: { select: { name: true } } } });
    await tx.product.update({ where: { restaurantId_id: { restaurantId, id: productId } },
      data: { currentStock: { increment: delta }, stockRevision: { increment: 1 } } });
    await tx.stockMovement.create({ data: {
      restaurantId, productId, delta, reason: "invoice_import_demo", operationId, actorId: "restaurant-simulation:v1",
      productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: product.supplier.name,
    } });
  });
}

it("seeds an isolated four-year fixture, exercises both source states, and deletes disposable tenants", async () => {
  const scenarioOwner = await account("scenario-owner");
  const archiveOwner = await account("scenario-archive");
  const replayOwner = await account("scenario-replay");
  const invoices = createAnonymizedSourceInvoices();
  const products = await prisma.product.findMany({ where: { restaurantId: scenarioOwner.restaurantId } });
  const plan = buildRestaurantSimulation(invoices, products.map((product) => ({
    id: product.id, name: product.name, unit: product.unit, currentStock: Number(product.currentStock),
    minThreshold: Number(product.minThreshold), pricePerUnit: Number(product.pricePerUnit),
    supplierId: product.supplierId, category: product.category,
  })));
  const recipes = await prisma.recipe.findMany({
    where: { restaurantId: scenarioOwner.restaurantId }, include: { ingredients: true },
  });
  const recipeSnapshots = recipes.map((recipe) => ({ ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient, quantity: Number(ingredient.quantity) })) }));
  const plannedRecipes = buildRecipePlan(recipeSnapshots, plan.productions);
  const suppliers = await prisma.supplier.findMany({ where: { restaurantId: scenarioOwner.restaurantId }, select: { id: true } });
  await applyRestaurantSimulation(scenarioOwner.restaurantId, plan, plannedRecipes, [], [], new Set(suppliers.map(({ id }) => id)));
  const scenarioProductions = await prisma.production.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
    operationId: { startsWith: "restaurant-simulation-v1:" } }, include: { recipeVersion: true } });
  expect(scenarioProductions).toHaveLength(plan.productions.length);
  expect(scenarioProductions.every((production) => production.recipeVersionId && production.recipeVersion?.actorId === "restaurant-simulation:v1" &&
    production.recipeVersion?.effectiveFrom?.toISOString().slice(0, 10) === plan.startDate)).toBe(true);
  await prisma.workspaceDocument.createMany({ data: invoices.map((invoice) => ({
    restaurantId: scenarioOwner.restaurantId,
    kind: `source-invoice:${invoice.id}`,
    data: sourceDocument(invoice),
  })) });

  const received = plan.receipts[0];
  const simulationOperationId = `restaurant-simulation-v1:invoice:${received.invoiceId}:${received.productId}`;
  const receivedInvoice = invoices.find((invoice) => invoice.id === received.invoiceId)!;
  const archiveOnly = invoices.find((invoice) => invoice.date?.startsWith("2023"))!;
  await upsertSourceDocument(archiveOwner.restaurantId, receivedInvoice);
  await upsertSourceDocument(archiveOwner.restaurantId, receivedInvoice);
  await upsertSourceDocument(replayOwner.restaurantId, receivedInvoice);

  const replayCatalogBefore = await replayOwner.agent.get("/api/workspace/catalog").expect(200);
  const replayProductBefore = replayCatalogBefore.body.products.find((product: { id: string }) => product.id === received.productId);
  expect(replayProductBefore).toBeDefined();
  await applyFixtureReceipt(replayOwner.restaurantId, received.productId, received.invoiceId, received.quantity);
  await applyFixtureReceipt(replayOwner.restaurantId, received.productId, received.invoiceId, received.quantity);
  await Promise.all([1, 2].map(() => applyFixtureReceipt(replayOwner.restaurantId, received.productId, received.invoiceId, received.quantity)));
  const replayCatalogAfter = await replayOwner.agent.get("/api/workspace/catalog").expect(200);
  expect(replayCatalogAfter.body.products.find((product: { id: string }) => product.id === received.productId).currentStock)
    .toBeCloseTo(Number(replayProductBefore.currentStock) + received.quantity, 3);
  expect(await prisma.stockMovement.count({ where: {
    restaurantId: replayOwner.restaurantId,
    operationId: simulationOperationId,
  } })).toBe(1);
  const replayedMovement = await prisma.stockMovement.findUniqueOrThrow({
    where: { restaurantId_operationId_productId: {
      restaurantId: replayOwner.restaurantId, operationId: simulationOperationId, productId: received.productId,
    } },
  });
  expect(replayedMovement.delta.toNumber()).toBe(received.quantity);
  expect(replayedMovement.reason).toBe("invoice_import_demo");
  expect(replayedMovement.actorId).toBe("restaurant-simulation:v1");

  const archivedOnlyOperationPrefix = `restaurant-simulation-v1:invoice:${archiveOnly.id}:`;
  expect(plan.yearCoverage["2023"].invoiceReceipts).toBe(0);
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId, operationId: simulationOperationId } })).toBe(1);
  expect(await prisma.stockMovement.count({ where: {
    restaurantId: scenarioOwner.restaurantId, operationId: { startsWith: archivedOnlyOperationPrefix },
  } })).toBe(0);

  const archiveMonth = archiveOnly.date!.slice(0, 7);
  const [archiveYear, archiveMonthNumber] = archiveMonth.split("-").map(Number);
  const archiveMonthFrom = `${archiveMonth}-01`;
  const archiveMonthTo = new Date(Date.UTC(archiveYear, archiveMonthNumber, 0)).toISOString().slice(0, 10);
  const asOfToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const movementCountBeforeTimeline = await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId } });
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId,
    actorId: "restaurant-simulation:v1", productNameSnapshot: null } })).toBe(0);
  const scenarioStockBeforeTimeline = await prisma.product.findMany({ where: { restaurantId: scenarioOwner.restaurantId },
    select: { id: true, currentStock: true } });
  const plannedSale = plan.sales.find((sale) => sale.date.startsWith(archiveMonth))!;
  await scenarioOwner.agent.post("/api/workspace/sales/recipe-mappings").send({
    saleItemId: plannedSale.itemId, recipeId: plannedSale.recipeId, expectedRevision: 0,
    operationId: randomUUID(), effectiveFrom: archiveOnly.date, portionsPerItem: 1,
  }).expect(201);
  await prisma.recommendationDecision.create({ data: {
    restaurantId: scenarioOwner.restaurantId, actorId: scenarioOwner.userId, operationId: randomUUID(),
    decision: "scenario_reviewed", snapshot: { source: "isolated timeline fixture" },
    createdAt: new Date(`${archiveOnly.date}T12:00:00.000Z`),
  } });
  await prisma.serviceDay.create({ data: {
    restaurantId: scenarioOwner.restaurantId, serviceDate: new Date(`${archiveMonth}-01T00:00:00.000Z`),
    status: "open", coverage: "partial", source: "recorded", actorId: scenarioOwner.userId,
  } });
  const archiveTimeline = await scenarioOwner.agent.get("/api/workspace/timeline")
    .query({ from: archiveMonthFrom, to: archiveMonthTo, asOf: asOfToday }).expect(200);
  expect(archiveTimeline.body.events.some((event: { id: string; provenance: string }) =>
    event.id === `document:source-invoice:${archiveOnly.id}` && event.provenance === "source")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { label: string }) => event.label === "Stock d’ouverture fictif")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { label: string }) => event.label === "Réception simulée depuis une pièce source")).toBe(false);
  expect(archiveTimeline.body.events.some((event: { provenance: string }) => event.provenance === "simulation")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { provenance: string }) => event.provenance === "assumption")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { provenance: string }) => event.provenance === "unknown")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "recipe")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "production")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "sale")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "loss")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "service")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string; qualifier?: string }) =>
    event.kind === "service" && event.qualifier?.includes("partiel"))).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "mapping")).toBe(true);
  expect(archiveTimeline.body.events.some((event: { kind: string }) => event.kind === "decision")).toBe(true);
  expect(archiveTimeline.body.events.every((event: object) => !("content" in event) && !("stockLines" in event))).toBe(true);

  const earlyVersion = await prisma.recipeVersion.findFirstOrThrow({ where: {
    restaurantId: scenarioOwner.restaurantId, recipeId: plannedRecipes[0].id,
  }, orderBy: { version: "desc" } });
  const lateVersion = await prisma.recipeVersion.create({ data: {
    restaurantId: scenarioOwner.restaurantId, recipeId: earlyVersion.recipeId, version: earlyVersion.version + 1,
    effectiveFrom: new Date(`${archiveOnly.date}T00:00:00.000Z`), operationId: `timeline-late:${randomUUID()}`,
    actorId: scenarioOwner.userId, name: "Version connue plus tard", category: earlyVersion.category,
    prepTime: earlyVersion.prepTime, yieldPortions: earlyVersion.yieldPortions,
  } });
  const historicTimeline = await scenarioOwner.agent.get("/api/workspace/timeline")
    .query({ from: archiveMonthFrom, to: archiveMonthTo, asOf: archiveOnly.date }).expect(200);
  expect(historicTimeline.body.events.some((event: { id: string }) => event.id === `recipe:${lateVersion.id}`)).toBe(false);
  expect(historicTimeline.body.events.some((event: { id: string }) => event.id === `document:source-invoice:${archiveOnly.id}`)).toBe(false);
  const otherTenantTimeline = await archiveOwner.agent.get("/api/workspace/timeline")
    .query({ from: archiveMonthFrom, to: archiveMonthTo, asOf: asOfToday }).expect(200);
  expect(otherTenantTimeline.body.events.some((event: { id: string }) =>
    event.id === `document:source-invoice:${archiveOnly.id}`)).toBe(false);
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(movementCountBeforeTimeline);
  const scenarioStockAfterTimeline = await prisma.product.findMany({ where: { restaurantId: scenarioOwner.restaurantId },
    select: { id: true, currentStock: true } });
  expect(scenarioStockAfterTimeline.map((product) => [product.id, product.currentStock.toString()]))
    .toEqual(scenarioStockBeforeTimeline.map((product) => [product.id, product.currentStock.toString()]));

  const archiveStockBefore = await archiveOwner.agent.get("/api/workspace/catalog").expect(200);
  const archiveProductBefore = archiveStockBefore.body.products.find((product: { id: string }) => product.id === received.productId);
  const sourceList = await scenarioOwner.agent.get("/api/workspace/source-invoices").expect(200);
  expect(sourceList.body).toHaveLength(431);
  expect((await scenarioOwner.agent.get(`/api/workspace/source-invoices/${receivedInvoice.id}`).expect(200)).body.title)
    .toBe(receivedInvoice.title);
  expect((await archiveOwner.agent.get(`/api/workspace/source-invoices/${receivedInvoice.id}`).expect(200)).body.title)
    .toBe(receivedInvoice.title);
  const archiveStockAfter = await archiveOwner.agent.get("/api/workspace/catalog").expect(200);
  expect(archiveStockAfter.body.products.find((product: { id: string }) => product.id === received.productId).currentStock)
    .toBe(archiveProductBefore.currentStock);
  await scenarioOwner.agent.get(`/api/workspace/source-invoices/${archiveOnly.id}`).expect(200);

  const scenarioMovementCount = await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId } });
  const scenarioSalesCount = await prisma.dailySale.count({ where: { restaurantId: scenarioOwner.restaurantId, source: "demo_simulation" } });
  const scenarioContributionCount = await prisma.saleContribution.count({ where: { restaurantId: scenarioOwner.restaurantId,
    source: "demo_simulation", sourceKey: { startsWith: "restaurant-simulation-v1:" }, status: "accepted" } });
  const scenarioServiceDays = await prisma.serviceDay.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
    serviceDate: { gte: new Date(`${plan.startDate}T00:00:00.000Z`), lte: new Date(`${plan.endDate}T00:00:00.000Z`) } },
    select: { source: true } });
  const scenarioEventCount = await prisma.saleContributionEvent.count({ where: { restaurantId: scenarioOwner.restaurantId,
    kind: "accepted", actorId: "restaurant-simulation:v1" } });
  expect(scenarioMovementCount).toBe(plan.counts.stockMovements);
  expect(scenarioSalesCount).toBe(plan.counts.sales);
  expect(scenarioContributionCount).toBe(plan.counts.sales);
  expect(scenarioServiceDays.length).toBeGreaterThan(0);
  expect(scenarioServiceDays.every((day) => day.source === "demo_simulation")).toBe(true);
  expect(scenarioEventCount).toBe(plan.counts.sales);
  const otherSources = await archiveOwner.agent.get("/api/workspace/source-invoices").expect(200);
  expect(otherSources.body).toHaveLength(1);
  await archiveOwner.agent.get(`/api/workspace/products/${received.productId}/movements`).expect(200).expect(({ body }) => expect(body).toEqual([]));
  const replaySources = await replayOwner.agent.get("/api/workspace/source-invoices").expect(200);
  expect(replaySources.body).toHaveLength(1);
  await replayOwner.agent.get(`/api/workspace/products/${received.productId}/movements`).expect(200)
    .expect(({ body }) => expect(body).toHaveLength(1));

  await prisma.user.deleteMany({ where: { id: { in: [scenarioOwner.userId, archiveOwner.userId, replayOwner.userId] } } });
  expect(await prisma.restaurant.findUnique({ where: { id: scenarioOwner.restaurantId } })).toBeNull();
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.dailySale.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.saleContribution.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.saleContributionEvent.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.product.count({ where: { restaurantId: scenarioOwner.restaurantId } })).toBe(0);
  expect(await prisma.restaurant.findUnique({ where: { id: archiveOwner.restaurantId } })).toBeNull();
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: archiveOwner.restaurantId } })).toBe(0);
  expect(await prisma.restaurant.findUnique({ where: { id: replayOwner.restaurantId } })).toBeNull();
  expect(await prisma.workspaceDocument.count({ where: { restaurantId: replayOwner.restaurantId } })).toBe(0);
  expect(await prisma.stockMovement.count({ where: { restaurantId: replayOwner.restaurantId } })).toBe(0);
}, 120_000);
