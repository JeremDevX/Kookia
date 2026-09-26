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
  const saved = await owner.agent.post("/api/workspace/orders/credits").send(credit).expect(201);
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
