import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const owners: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: owners } } }); await prisma.$disconnect(); });

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());
const sourceIdFor = () => randomUUID().replaceAll("-", "").slice(0, 24);

async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: "C3 fixture",
    email: `c3-${randomUUID()}@example.com`, password: "C3 isolated fixture password" }).expect(201);
  owners.push(response.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: response.body.user.id }, include: { restaurant: true } });
  return { agent, userId: user.id, restaurantId: user.restaurant!.id };
}

it("relie quatre chapitres, la suggestion revue, la réception simulée et son impact calculé", async () => {
  const owner = await account();
  await prisma.restaurant.update({ where: { id: owner.restaurantId }, data: { mode: "demo" } });
  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0] as { id: string; name: string; unit: string; stockRevision: number;
    supplierId: string; pricePerUnit: number };
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.supplierId,
  } } });
  const sourceUnit = product.unit;
  if (sourceUnit !== "kg" && sourceUnit !== "L" && sourceUnit !== "pcs") {
    throw new Error("The C3 fixture requires a source-compatible catalog unit.");
  }
  const today = parisToday();
  const asOf = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const historyFrom = new Date(Date.parse(asOf) - 27 * 86_400_000).toISOString().slice(0, 10);
  const serviceDate = (offset: number) => new Date(Date.parse(historyFrom) + offset * 86_400_000);
  const saleItem = await owner.agent.post("/api/workspace/sales/items").send({ name: "Plat synthétique C3" }).expect(201);
  const recipe = await owner.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Recette synthétique C3",
    category: "Plat", prepTime: 10, yieldPortions: 1, effectiveFrom: historyFrom,
    ingredients: [{ productId: product.id, quantity: 0.1 }] }).expect(201);
  await owner.agent.post("/api/workspace/sales/recipe-mappings").send({ saleItemId: saleItem.body.id,
    recipeId: recipe.body.id, expectedRevision: 0, operationId: randomUUID(), effectiveFrom: historyFrom,
    portionsPerItem: 1 }).expect(201);

  await prisma.serviceDay.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: owner.restaurantId,
    serviceDate: serviceDate(index), status: "open" as const, coverage: "complete" as const,
    source: "demo_simulation" as const, actorId: "restaurant-simulation:v1" })) });
  await prisma.dailySale.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: owner.restaurantId,
    saleItemId: saleItem.body.id as string, serviceDate: serviceDate(index), quantity: 10, source: "demo_simulation" as const,
    operationId: randomUUID(), createdBy: "restaurant-simulation:v1", updatedBy: "restaurant-simulation:v1" })) });

  const chapterDocuments = new Map<string, string>();
  for (const [year, date] of [["2023", "2023-06-01"], ["2024", "2024-06-01"],
    ["2025", "2025-06-01"], ["2026", "2026-06-01"]]) {
    const id = sourceIdFor();
    chapterDocuments.set(year, id);
    const content = `Fixture entièrement fictive ${year}.`;
    const contentHash = createHash("sha256").update(content).digest("hex");
    const data: Prisma.InputJsonObject = { id, contentHash,
      title: `Pièce synthétique ${year}`, date, originalDate: null, supplier: supplier.name,
      type: "invoice", status: "Archive synthétique", content, stockLines: year === "2023" ? [] : [{
        name: product.name, quantity: 1, unit: sourceUnit, unitPrice: product.pricePerUnit,
        sourceQuantityText: `1 ${sourceUnit}`, sourceLineNumber: 1,
        priceBasis: "stated_unit_price", priceTaxBasis: "unknown",
      }] };
    await prisma.workspaceDocument.create({ data: { restaurantId: owner.restaurantId, kind: `source-invoice:${id}`, data } });
    await prisma.serviceDay.create({ data: { restaurantId: owner.restaurantId,
      serviceDate: new Date(`${date}T00:00:00.000Z`), status: "open", coverage: "complete",
      source: "demo_simulation", actorId: "restaurant-simulation:v1" } });
    await prisma.dailySale.create({ data: { restaurantId: owner.restaurantId, saleItemId: saleItem.body.id,
      serviceDate: new Date(`${date}T00:00:00.000Z`), quantity: 8, source: "demo_simulation", operationId: randomUUID(),
      createdBy: "restaurant-simulation:v1", updatedBy: "restaurant-simulation:v1" } });
    if (year !== "2023") await prisma.stockMovement.create({ data: { restaurantId: owner.restaurantId,
      productId: product.id, delta: 1, reason: "invoice_import_demo",
      operationId: `restaurant-simulation-v1:invoice:${id}:1:${product.id}`, actorId: "restaurant-simulation:v1",
      sourceDocumentId: id, sourceContentHash: contentHash, sourceDocumentRevision: 1,
      createdAt: new Date(`${date}T08:00:00.000Z`), productNameSnapshot: product.name,
      productUnitSnapshot: product.unit, supplierNameSnapshot: supplier.name } });
  }
  const archiveId = chapterDocuments.get("2023")!;

  const beforeCount = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(beforeCount.body).toMatchObject({ status: "ready", provenance: "demo_simulation", workspaceMode: "demo" });
  const target = beforeCount.body.suggestions.find((suggestion: { productId: string }) => suggestion.productId === product.id);
  expect(target).toMatchObject({ canAdd: false, status: "needs_stock_count", forecastNeed: 1 });
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } },
    data: { currentStock: 0, stockRevision: { increment: 1 } } });
  const countedProduct = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id,
  } } });
  await owner.agent.post(`/api/workspace/products/${product.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: countedProduct.stockRevision, expectedUnit: countedProduct.unit, countedQuantity: 0 }).expect(201);
  const ready = (await owner.agent.get("/api/workspace/orders/suggestions").expect(200)).body.suggestions
    .find((suggestion: { productId: string }) => suggestion.productId === product.id);
  expect(ready).toMatchObject({ status: "ready", canAdd: true });
  const decision = await owner.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({
    operationId: randomUUID(), suggestionKey: ready.suggestionKey, decision: "added", quantity: ready.estimatedQuantity,
  }).expect(201);
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: decision.body.operationId,
    productId: product.id, productName: ready.productName, quantity: ready.estimatedQuantity, unit: ready.unit,
    source: "dashboard", purchaseSuggestionOperationId: decision.body.operationId }] }).expect(200);
  const order = await owner.agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{
    productId: product.id, quantity: ready.estimatedQuantity, cartId: decision.body.operationId,
  }] }).expect(201);
  expect(order.body.status).toBe("simulated");

  const sourceId = sourceIdFor();
  const content = "Pièce synthétique créée uniquement pour le parcours C3.";
  const source: Prisma.InputJsonObject = { id: sourceId, contentHash: createHash("sha256").update(content).digest("hex"),
    title: "Pièce fictive du parcours C3", date: today, originalDate: null, supplier: supplier.name,
    type: "invoice", status: "Source synthétique à confirmer", content,
    stockLines: [{ name: product.name, quantity: ready.estimatedQuantity, unit: product.unit,
      unitPrice: product.pricePerUnit, sourceQuantityText: `${ready.estimatedQuantity} ${product.unit}`,
      sourceLineNumber: 1, priceBasis: "stated_unit_price", priceTaxBasis: "unknown" }],
  };
  await prisma.workspaceDocument.create({ data: { restaurantId: owner.restaurantId,
    kind: `source-invoice:${sourceId}`, data: source } });
  const sourceDraft = await owner.agent.post(`/api/workspace/invoices/from-source/${sourceId}`).send({}).expect(200);
  const invoice = await owner.agent.post(`/api/workspace/invoices/${sourceDraft.body.id}`).send({
    revision: sourceDraft.body.revision, receive: false,
    draft: { reference: sourceDraft.body.reference, date: sourceDraft.body.date, supplierId: product.supplierId,
      sourceTypeConfirmed: true, sourceDateConfirmed: true,
      lines: [{ ...sourceDraft.body.lines[0], productId: product.id, quantity: ready.estimatedQuantity,
        unit: product.unit, unitPrice: product.pricePerUnit, disposition: "stock" }] },
  }).expect(200);
  const beforeReceipt = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id,
  } } });
  const receipt = await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send({
    operationId: randomUUID(), invoiceDocumentId: invoice.body.id, invoiceDocumentRevision: invoice.body.revision,
    deliveryReference: "LIVRAISON-SIMULEE-C3", deliveryDate: today,
    lines: [{ invoiceLineIndex: 0, orderLineId: order.body.lines[0].id, receivedQuantity: ready.estimatedQuantity }],
  }).expect(201);
  expect(receipt.body).toMatchObject({ simulated: true, provenance: "demo_simulation", invoiceComplete: true });
  const afterReceipt = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id,
  } } });
  expect(afterReceipt.currentStock.toString()).toBe(beforeReceipt.currentStock.toString());
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId,
    purchaseReceiptLine: { receiptId: receipt.body.id } } })).toBe(0);
  const outflowEstimates = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: today, to: today }).expect(200);
  expect(outflowEstimates.body).toMatchObject({ from: today, to: today,
    assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 }, estimates: [] });

  const yesterday = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const impact = await owner.agent.get("/api/workspace/impact").query({ from: yesterday, to: today, monthly: "true" }).expect(200);
  expect(impact.body.current).toMatchObject({ recorded: { receivedCost: 0 }, hasSimulationData: true,
    simulation: { receiptCount: 1, menuItemUnits: 10 } });
  const expectedReceiptCost = product.pricePerUnit * ready.estimatedQuantity;
  expect(impact.body.current.simulation.receivedCost).toBe(expectedReceiptCost);
  expect(impact.body.current.excluded.simulatedReceiptLines).toBe(1);
  const receiptMonth = impact.body.monthly.find((month: { month: string }) => month.month === today.slice(0, 7));
  expect(receiptMonth).toMatchObject({ hasSimulationData: true,
    simulation: { receiptCount: 1, receivedCost: expectedReceiptCost } });

  for (const year of ["2023", "2024", "2025", "2026"]) {
    const from = `${year}-06-01`;
    const chapter = await owner.agent.get("/api/workspace/timeline").query({ from, to: `${year}-06-30`, asOf: today }).expect(200);
    expect(chapter.body.events.some((event: { provenance: string }) => event.provenance === "simulation")).toBe(true);
    expect(chapter.body.events.every((event: object) => !("content" in event) && !("stockLines" in event))).toBe(true);
    const sourceDocId = chapterDocuments.get(year)!;
    const sourceDetail = await owner.agent.get(`/api/workspace/source-invoices/${sourceDocId}`).expect(200);
    expect(sourceDetail.body.sourceMovementCount).toBe(year === "2023" ? 0 : 1);
    expect(sourceDetail.body.alreadyCreditedBySimulation).toBe(year !== "2023");
    expect(sourceDetail.body.stockLines).toHaveLength(year === "2023" ? 0 : 1);
    if (year !== "2023") expect(sourceDetail.body.stockLines[0]).toMatchObject({
      name: product.name, quantity: 1, unit: sourceUnit, sourceLineNumber: 1,
    });
    expect(chapter.body.events.some((event: { id: string }) => event.id === `document:source-invoice:${sourceDocId}`)).toBe(true);
    if (year === "2023") {
      expect(chapter.body.events.some((event: { kind: string; detail: string }) =>
        event.kind === "stock" && event.detail.includes(archiveId))).toBe(false);
    } else {
      expect(chapter.body.events.some((event: { kind: string; provenance: string; detail: string }) =>
        event.kind === "stock" && event.provenance === "simulation" && event.detail.includes(sourceDocId))).toBe(true);
    }
  }

  const story = await owner.agent.get("/api/workspace/timeline")
    .query({ from: `${today.slice(0, 7)}-01`, to: today, asOf: today }).expect(200);
  const events = story.body.events as Array<{ id: string; kind: string; provenance: string; detail: string; qualifier?: string }>;
  expect(events.find((event) => event.id === `decision:${decision.body.id}`)).toMatchObject({ provenance: "simulation" });
  expect(events.find((event) => event.id === `purchase-order:${order.body.id}`))
    .toMatchObject({ kind: "purchase_order", provenance: "simulation" });
  expect(events.find((event) => event.id === `purchase-receipt:${receipt.body.id}`))
    .toMatchObject({ kind: "purchase_receipt", provenance: "simulation" });
  expect(events.find((event) => event.id === `purchase-receipt:${receipt.body.id}`)?.detail).toContain(sourceId);
  expect(events.find((event) => event.id === `purchase-receipt:${receipt.body.id}`)?.qualifier).toContain("aucun stock réel");
  const historic = await owner.agent.get("/api/workspace/timeline")
    .query({ from: `${today.slice(0, 7)}-01`, to: today, asOf }).expect(200);
  expect(historic.body.events.some((event: { id: string }) => event.id === `purchase-order:${order.body.id}`)).toBe(false);
  expect(historic.body.events.some((event: { id: string }) => event.id === `purchase-receipt:${receipt.body.id}`)).toBe(false);

  const adjustmentOperationId = randomUUID();
  await owner.agent.post(`/api/workspace/products/${product.id}/stock`).send({ operationId: adjustmentOperationId,
    delta: 0.001, reason: "adjustment" }).expect(200);
  const adjustment = await prisma.stockMovement.findUniqueOrThrow({ where: { restaurantId_operationId_productId: {
    restaurantId: owner.restaurantId, operationId: adjustmentOperationId, productId: product.id,
  } } });
  const manualProduction = await owner.agent.post("/api/workspace/productions").send({ operationId: randomUUID(),
    recipeName: "Déclaration synthétique C3", portions: 2, prepTime: 10, notes: "Fixture uniquement",
    date: today, kind: "record" }).expect(201);
  const updatedStory = await owner.agent.get("/api/workspace/timeline")
    .query({ from: `${today.slice(0, 7)}-01`, to: today, asOf: today }).expect(200);
  const updatedEvents = updatedStory.body.events as Array<{ id: string; label: string; provenance: string; qualifier?: string }>;
  expect(updatedEvents.find((event) => event.id === `stock:${adjustment.id}`)).toMatchObject({
    provenance: "simulation", qualifier: expect.stringContaining("bac de démonstration"),
  });
  expect(updatedEvents.find((event) => event.id === `production:${manualProduction.body.id}`)).toMatchObject({
    label: "Production déclarée (démo)", provenance: "simulation",
    qualifier: expect.stringContaining("n’atteste pas une production réelle"),
  });
}, 120_000);
