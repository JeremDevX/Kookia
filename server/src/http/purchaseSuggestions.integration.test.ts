import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ownerIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ownerIds } } }); await prisma.$disconnect(); });

async function account(name: string) {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: name,
    email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@example.com`, password: "purchase test password" }).expect(201);
  ownerIds.push(result.body.user.id);
  await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, actorId: result.body.user.id as string, restaurantId: restaurant.id };
}

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric",
  month: "2-digit", day: "2-digit" }).format(new Date());

async function seedSalesAndRecipe(tenant: Awaited<ReturnType<typeof account>>, productId: string,
  source: "manual" | "demo_simulation", additionalProductId?: string) {
  const saleItem = await tenant.agent.post("/api/workspace/sales/items").send({ name: "Plat suivi" }).expect(201);
  const today = parisToday();
  const asOf = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
  const date = (index: number) => new Date(Date.parse(asOf) + (index - 27) * 86_400_000);
  await prisma.serviceDay.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: tenant.restaurantId,
    serviceDate: date(index), status: "open" as const, coverage: "complete" as const,
    source: source === "demo_simulation" ? "demo_simulation" as const : "recorded" as const, actorId: tenant.actorId })) });
  await prisma.dailySale.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ restaurantId: tenant.restaurantId,
    saleItemId: saleItem.body.id as string, serviceDate: date(index), quantity: 10, source,
    operationId: randomUUID(), createdBy: tenant.actorId, updatedBy: tenant.actorId })) });
  const recipe = await tenant.agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Recette suivie",
    category: "Plat", prepTime: 10, yieldPortions: 4, effectiveFrom: date(0).toISOString().slice(0, 10),
    ingredients: [{ productId, quantity: 2 }, ...(additionalProductId ? [{ productId: additionalProductId, quantity: 1 }] : [])] }).expect(201);
  await tenant.agent.post("/api/workspace/sales/recipe-mappings").send({ saleItemId: saleItem.body.id,
    recipeId: recipe.body.id, expectedRevision: 0, operationId: randomUUID(),
    effectiveFrom: date(0).toISOString().slice(0, 10), portionsPerItem: 2 }).expect(201);
}

it("requires a current count, stores immutable suggestion decisions, rejects simulation purchases and marks demo orders", async () => {
  const owner = await account("Purchase owner");
  const other = await account("Purchase other");
  const demo = await account("Purchase demo");
  await prisma.restaurant.update({ where: { id: demo.restaurantId }, data: { mode: "demo" } });

  const catalog = await owner.agent.get("/api/workspace/catalog").expect(200);
  const product = catalog.body.products[0] as { id: string; name: string; unit: string; stockRevision: number;
    supplierId: string; pricePerUnit: number };
  const additionalProduct = catalog.body.products.find((candidate: { id: string }) => candidate.id !== product.id) as
    { id: string; unit: string };
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } },
    data: { currentStock: 2, stockRevision: { increment: 1 } } });
  await seedSalesAndRecipe(owner, product.id, "manual", additionalProduct.id);

  const beforeCount = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(beforeCount.body).toMatchObject({ status: "ready", provenance: "recorded_sales", workspaceMode: "operational" });
  const suggestion = beforeCount.body.suggestions.find((item: { productId: string }) => item.productId === product.id);
  expect(suggestion).toMatchObject({ status: "needs_stock_count", forecastNeed: 10, countedStock: null,
    estimatedQuantity: null, canAdd: false });
  const fakeDecision = randomUUID();
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: fakeDecision, productId: product.id,
    productName: product.name, quantity: 1, unit: product.unit, source: "dashboard", purchaseSuggestionOperationId: fakeDecision }] }).expect(409);

  const currentProduct = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: product.id } } });
  await owner.agent.post(`/api/workspace/products/${product.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: currentProduct.stockRevision, expectedUnit: currentProduct.unit, countedQuantity: 2 }).expect(201);
  const afterCount = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  const ready = afterCount.body.suggestions.find((item: { productId: string }) => item.productId === product.id);
  expect(ready).toMatchObject({ status: "ready", canAdd: true, forecastNeed: 10, countedStock: 2, estimatedQuantity: 8 });
  const excludedSuggestion = afterCount.body.suggestions.find((item: { productId: string }) => item.productId === additionalProduct.id);
  const exclusionInput = { operationId: randomUUID(), suggestionKey: excludedSuggestion.suggestionKey, decision: "excluded" };
  await owner.agent.post(`/api/workspace/orders/suggestions/${additionalProduct.id}/decision`).send(exclusionInput).expect(201);
  const afterExclusion = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(afterExclusion.body.suggestions.find((item: { productId: string }) => item.productId === additionalProduct.id))
    .toMatchObject({ decision: { kind: "excluded", operationId: exclusionInput.operationId, quantity: null, orderId: null } });
  await other.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({ operationId: randomUUID(),
    suggestionKey: ready.suggestionKey, decision: "added", quantity: 5 }).expect(409);

  const decisionInput = { operationId: randomUUID(), suggestionKey: ready.suggestionKey, decision: "added", quantity: 5 };
  const decision = await owner.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send(decisionInput).expect(201);
  expect(decision.body).toMatchObject({ decision: "purchase_suggestion_added", replayed: false });
  const afterDecision = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(afterDecision.body.suggestions.find((item: { productId: string }) => item.productId === product.id))
    .toMatchObject({ decision: { kind: "added", operationId: decision.body.operationId, quantity: 5, orderId: null } });
  const decisionReplays = await Promise.all([1, 2].map(() => owner.agent
    .post(`/api/workspace/orders/suggestions/${product.id}/decision`).send(decisionInput).expect(201)));
  expect(decisionReplays.map((response) => response.body.id)).toEqual([decision.body.id, decision.body.id]);
  expect(decisionReplays.map((response) => response.body.replayed)).toEqual([true, true]);
  await owner.agent.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({ ...decisionInput, quantity: 6 }).expect(409);
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: decision.body.operationId,
    productId: product.id, productName: "nom client ignoré", quantity: 5, unit: product.unit, source: "dashboard",
    purchaseSuggestionOperationId: decision.body.operationId }] }).expect(200);
  const stockBeforeOrder = Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id } } })).currentStock);
  const orderInput = { operationId: randomUUID(), lines: [{ productId: product.id, quantity: 4, cartId: decision.body.operationId }] };
  const order = await owner.agent.post("/api/workspace/orders").send(orderInput).expect(201);
  expect(order.body).toMatchObject({ status: "validated", lines: [{ productName: product.name, quantity: 4 }] });
  const afterOrder = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(afterOrder.body.suggestions.find((item: { productId: string }) => item.productId === product.id))
    .toMatchObject({ decision: { kind: "added", operationId: decision.body.operationId, quantity: 5, orderId: order.body.id } });
  const savedDecision = await prisma.recommendationDecision.findFirstOrThrow({ where: { restaurantId: owner.restaurantId,
    operationId: orderInput.operationId } });
  expect(savedDecision.snapshot).toMatchObject({ workspaceMode: "operational", suggestions: [{ operationId: decision.body.operationId }] });
  const invoiceId = randomUUID();
  const invoicePrice = product.pricePerUnit + 0.5;
  const invoice = await owner.agent.post(`/api/workspace/invoices/${invoiceId}`).send({ revision: 0, receive: false,
    draft: { reference: "FACTURE-O2-1", date: parisToday(), supplierId: product.supplierId,
      lines: [{ productId: product.id, quantity: 3, unit: product.unit, unitPrice: invoicePrice }] } }).expect(200);
  const receiptInput = { operationId: randomUUID(), invoiceDocumentId: invoiceId, invoiceDocumentRevision: invoice.body.revision,
    deliveryReference: "BL-O2-1", deliveryDate: parisToday(),
    lines: [{ invoiceLineIndex: 0, orderLineId: order.body.lines[0].id, receivedQuantity: 2 }] };
  await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send(receiptInput).expect(409);
  const firstReceiptInput = { ...receiptInput, lines: [{ ...receiptInput.lines[0], priceDifferenceReason: "Écart vérifié sur la facture" }] };
  const firstReceipt = await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send(firstReceiptInput).expect(201);
  expect(firstReceipt.body).toMatchObject({ simulated: false, invoiceComplete: false, replayed: false,
    lines: [{ invoiceQuantity: 3, receivedQuantity: 2, quantityDifference: 1 }] });
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id } } })).currentStock)).toBe(stockBeforeOrder + 2);
  const afterReceiptSuggestions = await owner.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(afterReceiptSuggestions.body.suggestions.find((item: { productId: string }) => item.productId === product.id))
    .toMatchObject({ status: "needs_stock_count", canAdd: false, countedStock: null, decision: null });
  const receiptMovements = await prisma.stockMovement.findMany({ where: { restaurantId: owner.restaurantId,
    reason: "purchase_receipt", invoiceDocumentId: invoiceId } });
  expect(receiptMovements).toHaveLength(1);
  expect(Number(receiptMovements[0].unitPriceSnapshot)).toBe(invoicePrice);
  const receiptLineId = firstReceipt.body.lines[0].id as string;
  const receiptLineEvidence = await owner.agent.get(`/api/workspace/orders/receipt-lines/${receiptLineId}`).expect(200);
  expect(receiptLineEvidence.body).toMatchObject({ receiptLineId, productId: product.id, productName: product.name,
    deliveryReference: "BL-O2-1", deliveryDate: parisToday(), receivedQuantity: 2, unit: product.unit });
  await other.agent.get(`/api/workspace/orders/receipt-lines/${receiptLineId}`).expect(404);
  expect((await owner.agent.get("/api/auth/me").expect(200)).body.user.id).toBe(owner.actorId);
  const listedOrder = (await owner.agent.get("/api/workspace/orders").expect(200)).body
    .find((item: { id: string }) => item.id === order.body.id);
  expect(listedOrder.receipts[0].lines[0].stockMovementId).toBe(receiptMovements[0].id);
  const movementHistory = await owner.agent.get(`/api/workspace/products/${product.id}/movements`).expect(200);
  expect(movementHistory.body).toContainEqual(expect.objectContaining({ id: receiptMovements[0].id,
    purchaseReceiptLineId: receiptLineId }));
  const receiptReplays = await Promise.all([1, 2].map(() => owner.agent
    .post(`/api/workspace/orders/${order.body.id}/receipts`).send(firstReceiptInput).expect(201)));
  expect(receiptReplays.map((response) => response.body.id)).toEqual([firstReceipt.body.id, firstReceipt.body.id]);
  expect(receiptReplays.map((response) => response.body.replayed)).toEqual([true, true]);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId,
    reason: "purchase_receipt", invoiceDocumentId: invoiceId } })).toBe(1);
  await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send({ ...firstReceiptInput,
    operationId: randomUUID(), lines: [{ ...firstReceiptInput.lines[0], receivedQuantity: 1 }] }).expect(409);
  expect((await owner.agent.get("/api/workspace/orders").expect(200)).body[0]).toMatchObject({ status: "partially_received",
    lines: [{ receivedQuantity: 2, remainingQuantity: 2 }], receipts: [{ invoiceComplete: false }] });
  const secondReceiptInput = { ...receiptInput, operationId: randomUUID(), deliveryReference: "BL-O2-2",
    lines: [{ ...firstReceiptInput.lines[0], receivedQuantity: 1 }] };
  const secondReceipt = await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send(secondReceiptInput).expect(201);
  expect(secondReceipt.body).toMatchObject({ invoiceComplete: true, simulated: false });
  const savedInvoice = (await owner.agent.get("/api/workspace/invoices").expect(200)).body.find((item: { id: string }) => item.id === invoiceId);
  expect(savedInvoice).toMatchObject({ status: "received", supplierId: product.supplierId });
  const realImpact = await owner.agent.get(`/api/workspace/impact?from=${parisToday()}&to=${parisToday()}`).expect(200);
  expect(realImpact.body.current.recorded).toMatchObject({ receivedCost: invoicePrice * 3, receiptCount: 2 });
  expect(realImpact.body.current.recorded.receiptsByProduct).toMatchObject([{ productId: product.id,
    receivedQuantity: 3, cost: invoicePrice * 3, receiptIds: expect.arrayContaining([firstReceipt.body.id, secondReceipt.body.id]) }]);
  const [salesBeforeOutflowEstimate, movementsBeforeOutflowEstimate] = await Promise.all([
    prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } }),
    prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } }),
  ]);
  const outflowEstimate = await owner.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: parisToday(), to: parisToday() }).expect(200);
  expect(outflowEstimate.body).toMatchObject({ assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 } });
  expect(outflowEstimate.body.estimates).toEqual(expect.arrayContaining([
    expect.objectContaining({ receiptReference: "BL-O2-1", productId: product.id, receivedQuantity: 2,
      recipeName: "Recette suivie", possiblePortions: 4, estimatedSoldPortions: 3.6, estimatedLossPortions: 0.4,
      estimatedSoldQuantity: 1.8, estimatedLossQuantity: 0.2 }),
    expect.objectContaining({ receiptReference: "BL-O2-2", productId: product.id, receivedQuantity: 1,
      recipeName: "Recette suivie", possiblePortions: 2, estimatedSoldPortions: 1.8, estimatedLossPortions: 0.2,
      estimatedSoldQuantity: 0.9, estimatedLossQuantity: 0.1 }),
  ]));
  expect(await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } })).toBe(salesBeforeOutflowEstimate);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(movementsBeforeOutflowEstimate);
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: owner.restaurantId, id: product.id } } })).currentStock)).toBe(stockBeforeOrder + 3);
  await owner.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send({ ...secondReceiptInput,
    operationId: randomUUID() }).expect(409);
  await other.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send(secondReceiptInput).expect(404);
  const orderReplays = await Promise.all([1, 2].map(() => owner.agent.post("/api/workspace/orders").send(orderInput).expect(201)));
  expect(orderReplays.map((response) => response.body.id)).toEqual([order.body.id, order.body.id]);
  await owner.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: randomUUID(), productId: product.id,
    productName: product.name, quantity: 5, unit: product.unit, source: "dashboard",
    purchaseSuggestionOperationId: decision.body.operationId }] }).expect(409);
  await owner.agent.post("/api/workspace/orders").send({ ...orderInput, lines: [{ ...orderInput.lines[0], quantity: 3 }] }).expect(409);

  const demoCatalog = await demo.agent.get("/api/workspace/catalog").expect(200);
  const demoProduct = demoCatalog.body.products[0] as { id: string; name: string; unit: string; supplierId: string; pricePerUnit: number };
  await prisma.product.update({ where: { restaurantId_id: { restaurantId: demo.restaurantId, id: demoProduct.id } },
    data: { currentStock: 2, stockRevision: { increment: 1 } } });
  await seedSalesAndRecipe(demo, demoProduct.id, "manual");
  const demoProductState = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: demo.restaurantId, id: demoProduct.id } } });
  await demo.agent.post(`/api/workspace/products/${demoProduct.id}/counts`).send({ operationId: randomUUID(),
    expectedStockRevision: demoProductState.stockRevision, expectedUnit: demoProductState.unit, countedQuantity: 2 }).expect(201);
  const demoSuggestions = await demo.agent.get("/api/workspace/orders/suggestions").expect(200);
  expect(demoSuggestions.body).toMatchObject({ status: "ready", workspaceMode: "demo", provenance: "demo_simulation" });
  const demoSuggestion = demoSuggestions.body.suggestions.find((item: { productId: string }) => item.productId === demoProduct.id);
  expect(demoSuggestion).toMatchObject({ canAdd: true, estimatedQuantity: 8 });
  const demoDecision = await demo.agent.post(`/api/workspace/orders/suggestions/${demoProduct.id}/decision`).send({
    operationId: randomUUID(), suggestionKey: demoSuggestion.suggestionKey, decision: "added", quantity: 8 }).expect(201);
  await demo.agent.post("/api/workspace/cart").send({ action: "add", items: [{ id: demoDecision.body.operationId,
    productId: demoProduct.id, productName: demoProduct.name, quantity: 8, unit: demoProduct.unit,
    source: "dashboard", purchaseSuggestionOperationId: demoDecision.body.operationId }] }).expect(200);
  const demoOrderInput = { operationId: randomUUID(), lines: [{ productId: demoProduct.id, quantity: 8, cartId: demoDecision.body.operationId }] };
  const demoOrder = await demo.agent.post("/api/workspace/orders").send(demoOrderInput).expect(201);
  expect(demoOrder.body.status).toBe("simulated");
  const demoInvoiceId = randomUUID();
  const demoInvoice = await demo.agent.post(`/api/workspace/invoices/${demoInvoiceId}`).send({ revision: 0, receive: false,
    draft: { reference: "FACTURE-DEMO-1", date: parisToday(), supplierId: demoProduct.supplierId,
      lines: [{ productId: demoProduct.id, quantity: 8, unit: demoProduct.unit, unitPrice: demoProduct.pricePerUnit }] } }).expect(200);
  const demoReceipt = await demo.agent.post(`/api/workspace/orders/${demoOrder.body.id}/receipts`).send({
    operationId: randomUUID(), invoiceDocumentId: demoInvoiceId, invoiceDocumentRevision: demoInvoice.body.revision,
    deliveryReference: "BL-DEMO-1", deliveryDate: parisToday(),
    lines: [{ invoiceLineIndex: 0, orderLineId: demoOrder.body.lines[0].id, receivedQuantity: 8 }],
  }).expect(201);
  expect(demoReceipt.body).toMatchObject({ simulated: true, invoiceComplete: true });
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: {
    restaurantId: demo.restaurantId, id: demoProduct.id } } })).currentStock)).toBe(2);
  expect((await demo.agent.get("/api/workspace/ingredient-outflow-estimates")
    .query({ from: parisToday(), to: parisToday() }).expect(200)).body.estimates).toEqual([]);
  expect(await prisma.stockMovement.count({ where: { restaurantId: demo.restaurantId,
    reason: "purchase_receipt" } })).toBe(0);
  const demoImpact = await demo.agent.get(`/api/workspace/impact?from=${parisToday()}&to=${parisToday()}`).expect(200);
  expect(demoImpact.body.current.recorded.receivedCost).toBe(0);
  expect(demoImpact.body.current.simulation).toMatchObject({ receivedCost: demoProduct.pricePerUnit * 8, receiptCount: 1 });
  expect(demoImpact.body.current.excluded.simulatedReceiptLines).toBe(1);
  expect((await demo.agent.get(`/api/workspace/report?from=${parisToday()}&to=${parisToday()}`).expect(200)).body.rows).toEqual([]);
  const simulatedSales = await account("Purchase simulated source");
  await seedSalesAndRecipe(simulatedSales, (await simulatedSales.agent.get("/api/workspace/catalog").expect(200)).body.products[0].id,
    "demo_simulation");
  expect((await simulatedSales.agent.get("/api/workspace/orders/suggestions").expect(200)).body)
    .toMatchObject({ status: "simulation_only", provenance: "demo_simulation", workspaceMode: "operational", suggestions: [] });
  expect(await request(app).get("/api/workspace/orders/suggestions").expect(401).then((response) => response.body)).toHaveProperty("error");
});
