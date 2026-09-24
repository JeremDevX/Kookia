import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createAnonymizedSourceInvoices } from "../scripts/fixtures/anonymizedSourceInvoices.js";
import { seedLocalDemoScenario } from "../scripts/localDemoScenario.js";

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
  const { plan, recipeIdeaSources } = await seedLocalDemoScenario(scenarioOwner.userId);
  expect(plan.counts.invoiceDocuments).toBe(invoices.length);
  const rangeStart = new Date("2023-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2027-01-01T00:00:00.000Z");
  const [monthlyServiceDays, monthlySales, monthlyLosses] = await Promise.all([
    prisma.serviceDay.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
      serviceDate: { gte: rangeStart, lt: rangeEnd } }, select: { serviceDate: true, status: true, coverage: true } }),
    prisma.dailySale.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
      serviceDate: { gte: rangeStart, lt: rangeEnd } }, include: { saleItem: { select: { name: true } } } }),
    prisma.stockMovement.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
      createdAt: { gte: rangeStart, lt: rangeEnd }, reason: { in: ["loss", "simulation_loss"] }, delta: { lt: 0 } },
      include: { product: { select: { unit: true } } } }),
  ]);
  const monthlyReport = await scenarioOwner.agent.get("/api/workspace/impact")
    .query({ from: "2023-01-01", to: "2026-12-31", monthly: "true" }).expect(200);
  expect(monthlyReport.body.monthly).toHaveLength(48);
  for (let monthOffset = 0; monthOffset < 48; monthOffset += 1) {
    const year = 2023 + Math.floor(monthOffset / 12);
    const month = monthOffset % 12 + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const from = `${monthKey}-01`;
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const inMonth = (date: Date) => date.toISOString().slice(0, 7) === monthKey;
    const days = monthlyServiceDays.filter((day) => inMonth(day.serviceDate));
    const sales = monthlySales.filter((sale) => inMonth(sale.serviceDate));
    const losses = monthlyLosses.filter((movement) => inMonth(movement.createdAt));
    const compatibleLosses = losses.filter((movement) =>
      (movement.productUnitSnapshot ?? movement.product.unit) === movement.product.unit);
    const unitsSold = sales.reduce((total, sale) => total + sale.quantity, 0);
    const lossQuantity = compatibleLosses.reduce((total, movement) => total + movement.delta.abs().toNumber(), 0);
    const lossCost = compatibleLosses.reduce((total, movement) => total + (movement.unitPriceSnapshot === null ? 0 :
      movement.delta.abs().mul(movement.unitPriceSnapshot).toNumber()), 0);
    const report = await scenarioOwner.agent.get("/api/workspace/impact").query({ from, to }).expect(200);
    const current = report.body.current;
    const monthly = monthlyReport.body.monthly[monthOffset];
    expect(monthly).toMatchObject({ month: monthKey, from, to, calendarDays, hasRecordedData: false,
      hasSimulationData: days.length + sales.length + losses.length > 0, excluded: current.excluded });
    expect(monthly.recorded).toMatchObject({ menuItemUnits: current.recorded.menuItemUnits,
      serviceDays: current.recorded.serviceDays, lossMovementCount: current.recorded.lossMovementCount,
      knownLossCost: current.recorded.knownLossCost, unpricedLossMovementCount: current.recorded.unpricedLossMovementCount,
      receivedCost: current.recorded.receivedCost, receiptCount: current.recorded.receiptCount });
    expect(monthly.simulation).toMatchObject({ menuItemUnits: current.simulation.menuItemUnits,
      serviceDays: current.simulation.serviceDays, lossMovementCount: current.simulation.lossMovementCount,
      knownLossCost: current.simulation.knownLossCost, unpricedLossMovementCount: current.simulation.unpricedLossMovementCount,
      receivedCost: current.simulation.receivedCost, receiptCount: current.simulation.receiptCount });
    expect(current).toMatchObject({ from, to, calendarDays, hasRecordedData: false,
      hasSimulationData: days.length + sales.length + losses.length > 0,
      excluded: { simulatedSales: sales.length, simulatedLosses: losses.length, simulatedReceiptLines: 0 } });
    expect(current.recorded).toMatchObject({ menuItemUnits: 0, lossMovementCount: 0, receivedCost: 0,
      serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0, unregistered: calendarDays } });
    expect(current.simulation).toMatchObject({ menuItemUnits: unitsSold, lossMovementCount: compatibleLosses.length,
      unpricedLossMovementCount: compatibleLosses.filter((movement) => movement.unitPriceSnapshot === null).length,
      receiptCount: 0, receivedCost: 0, serviceDays: { complete: days.filter((day) => day.status === "open" &&
        day.coverage === "complete").length, partial: 0, coverageMissing: 0, closed: 0,
        unregistered: calendarDays - days.length } });
    expect(current.simulation.knownLossCost).toBeCloseTo(lossCost, 8);
    expect(current.simulation.lossesByProduct.reduce((total: number, item: { quantity: number }) => total + item.quantity, 0))
      .toBeCloseTo(lossQuantity, 8);
    expect(current.simulation.salesByItem.flatMap((item: { operationIds: string[] }) => item.operationIds).sort())
      .toEqual(sales.map((sale) => sale.operationId).sort());
    expect(current.simulation.lossesByProduct.flatMap((item: { operationIds: string[] }) => item.operationIds).sort())
      .toEqual(compatibleLosses.map((movement) => movement.operationId).sort());
  }
  const seededCandidates = await scenarioOwner.agent.get("/api/workspace/recipe-candidates").expect(200);
  expect(seededCandidates.body.available).toBe(true);
  expect(seededCandidates.body.candidates.map((candidate: { status: string; recipeId: string | null;
    recipe: { name: string }; ingredients: Array<{ evidence: { sourceDocumentId: string; sourceName: string } }> }) => ({
    status: candidate.status, recipeId: candidate.recipeId, name: candidate.recipe.name,
    sourceDocumentId: candidate.ingredients[0]?.evidence.sourceDocumentId,
    sourceName: candidate.ingredients[0]?.evidence.sourceName,
  }))).toEqual(expect.arrayContaining([
    { status: "pending", recipeId: null, name: "Hypothèse — poêlée de champignons",
      sourceDocumentId: recipeIdeaSources[0].id, sourceName: "Champignons" },
    { status: "pending", recipeId: null, name: "Hypothèse — sauce à la crème",
      sourceDocumentId: recipeIdeaSources[1].id, sourceName: "Crème Fraîche" },
  ]));
  const scenarioProductions = await prisma.production.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
    operationId: { startsWith: "restaurant-simulation-v1:" } }, include: { recipeVersion: true } });
  expect(scenarioProductions).toHaveLength(plan.productions.length);
  for (const production of scenarioProductions) {
    const planned = plan.productions.find((candidate) => candidate.id === production.id)!;
    const version = plan.recipeVersions.find((candidate) => candidate.recipeId === production.recipeId &&
      candidate.sequence === planned.recipeVersionSequence)!;
    expect(production.recipeVersionId).toBeTruthy();
    expect(production.recipeVersion?.actorId).toBe("restaurant-simulation:v1");
    expect(production.recipeVersion?.effectiveFrom?.toISOString().slice(0, 10)).toBe(version.effectiveFrom);
  }
  const oldCarbonara = scenarioProductions.find((production) => production.recipeId === "r3" && production.date.toISOString().slice(0, 10) < "2025-06-16")!;
  const newCarbonara = scenarioProductions.find((production) => production.recipeId === "r3" && production.date.toISOString().slice(0, 10) >= "2025-06-16")!;
  expect(oldCarbonara.recipeVersion?.effectiveFrom?.toISOString().slice(0, 10)).toBe(plan.startDate);
  expect(newCarbonara.recipeVersion?.effectiveFrom?.toISOString().slice(0, 10)).toBe("2025-06-16");
  const refusal = scenarioProductions.find((production) => production.kind === "refusal")!;
  expect(refusal.notes).toContain("Aucune sortie de stock");
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId, operationId: refusal.operationId } })).toBe(0);
  expect(scenarioProductions.some((production) => production.recipeId === refusal.recipeId && production.kind === "production" &&
    production.date.toISOString().slice(0, 10) === refusal.date.toISOString().slice(0, 10))).toBe(true);
  expect((await prisma.restaurant.findUniqueOrThrow({ where: { id: scenarioOwner.restaurantId } })).mode).toBe("demo");

  const storyCounts = await prisma.stockCount.findMany({ where: { restaurantId: scenarioOwner.restaurantId,
    productId: { in: ["p1", "p11"] }, operationId: { startsWith: "restaurant-simulation-v1:stock-count:" } },
    orderBy: [{ countedAt: "asc" }, { id: "asc" }] });
  const overstock = storyCounts.find((count) => count.operationId.endsWith(":overstock")!);
  const currentTomatoCount = storyCounts.find((count) => count.operationId.endsWith(":current")!);
  expect(overstock?.countedQuantity.greaterThan(overstock.theoreticalQuantity)).toBe(true);
  expect(await prisma.stockMovement.count({ where: { restaurantId: scenarioOwner.restaurantId, stockCountId: overstock!.id } })).toBe(1);
  const tomato = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: scenarioOwner.restaurantId, id: "p1" } } });
  expect(currentTomatoCount?.countedQuantity.equals(tomato.currentStock)).toBe(true);
  expect(currentTomatoCount?.stockRevisionAfter).toBe(tomato.stockRevision);
  const surplusOptions = await scenarioOwner.agent.get("/api/workspace/menu/surplus-options").expect(200);
  expect(surplusOptions.body.options).toContainEqual(expect.objectContaining({
    productId: "p1", stockCountId: currentTomatoCount!.id, stockRevision: tomato.stockRevision,
  }));
  const juneTimeline = await scenarioOwner.agent.get("/api/workspace/timeline")
    .query({ from: "2025-06-01", to: "2025-06-30", asOf: "2026-09-23" }).expect(200);
  const decemberTimeline = await scenarioOwner.agent.get("/api/workspace/timeline")
    .query({ from: "2025-12-01", to: "2025-12-31", asOf: "2026-09-23" }).expect(200);
  expect(juneTimeline.body.events.some((event: { label: string; provenance: string; qualifier?: string }) =>
    event.label === "Surstock compté" && event.provenance === "simulation" && event.qualifier?.includes("non observé"))).toBe(true);
  expect(juneTimeline.body.events.some((event: { label: string; provenance: string; qualifier?: string }) =>
    event.label === "Perte enregistrée — scénario simulé" && event.provenance === "simulation" && event.qualifier?.includes("non observée"))).toBe(true);
  expect(decemberTimeline.body.events.some((event: { label: string; detail: string }) =>
    event.label === "Production refusée" && event.detail.includes("aucune sortie de stock"))).toBe(true);

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
    restaurantId: scenarioOwner.restaurantId, recipeId: plan.productions[0].recipeId,
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
  expect(sourceList.body).toHaveLength(invoices.length + recipeIdeaSources.length);
  expect(sourceList.body.map((source: { id: string }) => source.id))
    .toEqual(expect.arrayContaining(recipeIdeaSources.map((source) => source.id)));
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
