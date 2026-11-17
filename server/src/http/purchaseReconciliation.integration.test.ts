import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ownerIds: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ownerIds } } }); await prisma.$disconnect(); });

async function account() {
  const agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Purchase fixture",
    email: `purchase-chain-${randomUUID()}@example.com`, password: "isolated fixture password" }).expect(201);
  ownerIds.push(result.body.user.id);
  agent.set("X-Expected-User-Id", result.body.user.id);
  await ensureWorkspace(result.body.user.id);
  const catalog = await agent.get("/api/workspace/catalog").expect(200);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: result.body.user.id } });
  return { agent, restaurantId: restaurant.id, actorId: result.body.user.id as string, product: catalog.body.products[0] as { id: string; unit: string; currentStock: number; supplierId: string; pricePerUnit: number } };
}

it("validates supplier constraints and keeps confirmed ETA and credit separate from stock with tenant isolation", async () => {
  const owner = await account(), other = await account();
  await owner.agent.patch(`/api/workspace/suppliers/${owner.product.supplierId}`).send({ name: "Supplier fixture", email: "supplier@example.com", phone: "",
    deliveryWeekdays: [1, 4], leadTimeDays: 1, orderCutoffTime: "12:00" }).expect(200);
  await owner.agent.patch(`/api/workspace/suppliers/${owner.product.supplierId}`).send({ name: "Supplier fixture", email: "supplier@example.com", phone: "",
    deliveryWeekdays: [7], leadTimeDays: 1, orderCutoffTime: "12:00" }).expect(400);
  const order = await owner.agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: owner.product.id, quantity: 4 }] }).expect(201);
  const lineId = order.body.lines[0].id as string;
  const report = { operationId: randomUUID(), expectedRevision: 0, expectedDeliveryDate: "2026-10-01", note: "Date confirmée par le fournisseur" };
  await owner.agent.patch(`/api/workspace/orders/lines/${lineId}/delivery`).send(report).expect(200);
  expect((await owner.agent.patch(`/api/workspace/orders/lines/${lineId}/delivery`).send(report).expect(200)).body.replayed).toBe(true);
  await owner.agent.patch(`/api/workspace/orders/lines/${lineId}/delivery`).send({ ...report, note: "Autre motif" }).expect(409);
  await owner.agent.patch(`/api/workspace/orders/lines/${lineId}/delivery`).send({ ...report, operationId: randomUUID() }).expect(409);
  await other.agent.patch(`/api/workspace/orders/lines/${lineId}/delivery`).send({ ...report, operationId: randomUUID() }).expect(404);
  const receiptId = randomUUID();
  await prisma.purchaseReceipt.create({ data: { id: receiptId, restaurantId: owner.restaurantId, orderId: order.body.id,
    supplierId: owner.product.supplierId, actorId: owner.actorId, operationId: randomUUID(), invoiceReference: "FACT-FIXTURE",
    invoiceReferenceNormalized: "fact-fixture", invoiceDocumentId: randomUUID(), invoiceDocumentRevision: 1,
    deliveryReference: "BL-FIXTURE", deliveryDate: new Date("2026-10-01T00:00:00Z"), requestSnapshot: {} } });
  const credit = { operationId: randomUUID(), receiptId, reference: "AV-FIXTURE", amount: 3.25, reason: "Écart facture confirmé" };
  const wrongContext = await owner.agent.post("/api/workspace/orders/credits")
    .set("X-Expected-Restaurant-Id", other.restaurantId).send(credit).expect(409);
  expect(wrongContext.body.error.code).toBe("WORKSPACE_CHANGED");
  expect(await prisma.purchaseCredit.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
  const wrongRead = await owner.agent.get(`/api/workspace/orders/${order.body.id}/reconciliation`)
    .set("X-Expected-Restaurant-Id", other.restaurantId).expect(409);
  expect(wrongRead.body.error.code).toBe("WORKSPACE_CHANGED");
  const saved = await owner.agent.post("/api/workspace/orders/credits")
    .set("X-Expected-Restaurant-Id", owner.restaurantId).send(credit).expect(201);
  const concurrent = await Promise.all([1, 2].map(() => owner.agent.post("/api/workspace/orders/credits")
    .set("X-Expected-Restaurant-Id", owner.restaurantId).send(credit).expect(201)));
  expect(concurrent.map((response) => response.body)).toEqual([{ id: saved.body.id, replayed: true }, { id: saved.body.id, replayed: true }]);
  expect(await prisma.purchaseCredit.count({ where: { restaurantId: owner.restaurantId } })).toBe(1);
  expect((await owner.agent.post("/api/workspace/orders/credits").send(credit).expect(201)).body).toEqual({ id: saved.body.id, replayed: true });
  await owner.agent.post("/api/workspace/orders/credits").send({ ...credit, amount: 2 }).expect(409);
  await owner.agent.post("/api/workspace/orders/credits").send({ ...credit, operationId: randomUUID() }).expect(409);
  await other.agent.post("/api/workspace/orders/credits").send({ ...credit, operationId: randomUUID() }).expect(404);
  const chain = await owner.agent.get(`/api/workspace/orders/${order.body.id}/reconciliation`).expect(200);
  expect(chain.body.receipts[0]).toMatchObject({ receiptId, deliveryReference: "BL-FIXTURE", invoiceReference: "FACT-FIXTURE", credits: [{ reference: "AV-FIXTURE", amount: 3.25 }] });
  await other.agent.get(`/api/workspace/orders/${order.body.id}/reconciliation`).expect(404);
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: owner.restaurantId, id: owner.product.id } } })).currentStock)).toBe(owner.product.currentStock);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
});

it("pagine les commandes filtrées, retrouve les liens directs et ne charge que les réceptions du jour dans le planning", async () => {
  const owner = await account(), other = await account();
  const orderIds = Array.from({ length: 13 }, () => randomUUID());
  const lineIds = orderIds.map(() => randomUUID());
  const supplierId = owner.product.supplierId;
  const alternateSupplierId = randomUUID();
  await owner.agent.post("/api/workspace/suppliers").send({ id: alternateSupplierId, name: "Autre fournisseur",
    email: "second@example.com", phone: "" }).expect(201);
  await prisma.purchaseOrder.createMany({ data: orderIds.map((id, index) => ({
    id, restaurantId: owner.restaurantId, actorId: owner.actorId, operationId: randomUUID(),
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)),
    status: index === 0 ? "received" : index === 1 ? "partially_received" : index === 2 ? "simulated" : "validated",
  })) });
  const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
  await prisma.purchaseOrderLine.createMany({ data: orderIds.map((orderId, index) => ({
    id: lineIds[index], restaurantId: owner.restaurantId, orderId, productId: owner.product.id,
    productName: index === 0 ? "Farine spéciale" : "Farine courante", supplierId, supplierName: "Fournisseur test",
    unit: "kg", pricePerUnit: 1, quantity: 0.3, expectedDeliveryDate: index === 2 ? null
      : day(index === 1 ? "2026-10-10" : index === 3 ? "2026-10-09" : "2026-10-11"),
  })) });
  await prisma.purchaseOrderLine.create({ data: { restaurantId: owner.restaurantId, orderId: orderIds[1],
    productId: owner.product.id, productName: "Farine prochaine", supplierId: alternateSupplierId,
    supplierName: "Autre fournisseur", unit: "kg", pricePerUnit: 1, quantity: 0.3, expectedDeliveryDate: day("2026-10-11") } });
  async function createReceipt(index: number, deliveryDate: string, deliveryReference: string, receivedQuantity: number) {
    return prisma.purchaseReceipt.create({ data: {
      restaurantId: owner.restaurantId, actorId: owner.actorId, orderId: orderIds[index], supplierId, operationId: randomUUID(),
      invoiceReference: "FACTURE TEST", invoiceReferenceNormalized: "facture test", deliveryReference, deliveryDate: day(deliveryDate),
      invoiceDocumentId: randomUUID(), invoiceDocumentRevision: 1, requestSnapshot: {},
      lines: { create: { orderLineId: lineIds[index], productId: owner.product.id, productName: "Farine spéciale",
        invoiceLineIndex: 0, invoiceQuantity: 0.3, receivedQuantity, quantityDifference: 0,
        unit: "kg", orderedQuantity: 0.3, orderedUnitPrice: 1, invoiceUnitPrice: 1 } },
    } });
  }
  await createReceipt(0, "2026-10-09", "BL AVANT", 0.1);
  const target = await createReceipt(0, "2026-10-10", "BL DU JOUR", 0.2);
  await createReceipt(1, "2026-10-09", "BL PARTIEL", 0.1);

  const historyPath = "/api/workspace/orders?view=history";
  const first = (await owner.agent.get(`${historyPath}&receiptId=${target.id}`).expect(200)).body;
  expect(first).toMatchObject({ restaurantId: owner.restaurantId, page: 0, pageCount: 2, total: 13, filteredCount: 13,
    statusCounts: { validated: 10, partially_received: 1, received: 1, simulated: 1 },
    suppliers: [{ id: alternateSupplierId, name: "Autre fournisseur" }, { id: supplierId, name: "Fournisseur test" }],
    targetOrder: { id: orderIds[0] },
  });
  expect(first.targetOrder.receipts.map((receipt: { id: string }) => receipt.id)).toContain(target.id);
  expect(first.orders.map((order: { id: string }) => order.id)).toEqual(orderIds.slice(3).reverse());
  const second = (await owner.agent.get(`${historyPath}&page=1&receiptId=${target.id}`).expect(200)).body;
  expect(second.orders.map((order: { id: string }) => order.id)).toEqual(orderIds.slice(0, 3).reverse());
  expect(second.orders.find((order: { id: string }) => order.id === orderIds[1]).lines)
    .toContainEqual(expect.objectContaining({ id: lineIds[1], remainingQuantity: 0.2 }));
  expect(second.targetOrder).toBeNull();
  const filtered = (await owner.agent.get(historyPath).query({ status: "received", supplierId,
    query: "spéciale fournisseur", orderId: orderIds[1] }).expect(200)).body;
  expect(filtered).toMatchObject({ filteredCount: 1, orders: [{ id: orderIds[0] }], targetOrder: { id: orderIds[1] } });
  const pending = (await owner.agent.get(historyPath).query({ status: "pending", supplierId: alternateSupplierId,
    query: "courante fournisseur" }).expect(200)).body;
  expect(pending).toMatchObject({ filteredCount: 1, orders: [{ id: orderIds[1] }] });
  expect((await owner.agent.get(historyPath).query({ query: "du jour facture" }).expect(200)).body.filteredCount).toBe(1);
  expect((await owner.agent.get(historyPath).query({ query: "%" }).expect(200)).body.filteredCount).toBe(0);
  expect((await other.agent.get(historyPath).query({ receiptId: target.id }).expect(200)).body.targetOrder).toBeNull();
  await owner.agent.get(`${historyPath}&page=-1`).expect(400);
  await owner.agent.get("/api/workspace/orders?view=planning&date=2026-02-30").expect(400);

  const planning = (await owner.agent.get("/api/workspace/orders?view=planning&date=2026-10-10").expect(200)).body;
  expect(planning).toMatchObject([
    { id: orderIds[3], lines: [{ expectedDeliveryDate: "2026-10-09" }], receipts: [] },
    { id: orderIds[2], lines: [{ expectedDeliveryDate: null }], receipts: [] },
    { id: orderIds[1], lines: [{ expectedDeliveryDate: "2026-10-10", remainingQuantity: 0.2 }], receipts: [] },
    { id: orderIds[0], lines: [], receipts: [{ id: target.id }] },
  ]);
});
