import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect(); });
async function account() {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ displayName: "ACL", email: `acl-${randomUUID()}@example.test`, password: "test password for acl" }).expect(201);
  const id = response.body.user.id as string; ids.push(id); agent.set("X-Expected-User-Id", id); return { agent, id };
}
const restaurant = { name: "Test ACL", type: "Restaurant", address: "", city: "Test", phone: "", email: "acl@example.test", dailyCovers: 20 };
it("scopes members to their restaurant and immediately refuses requests after revocation", async () => {
  const owner = await account(), chef = await account(), kitchen = await account(), other = await account();
  await owner.agent.post("/api/setup").send({ ...restaurant, expectedUserId: owner.id }).expect(201);
  await other.agent.post("/api/setup").send({ ...restaurant, name: "Autre", expectedUserId: other.id }).expect(201);
  const target = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: owner.id } });
  await prisma.membership.createMany({ data: [{ userId: chef.id, restaurantId: target.id, role: "chef" }, { userId: kitchen.id, restaurantId: target.id, role: "kitchen" }] });
  for (const [candidate, role] of [[owner, "owner"], [chef, "chef"], [kitchen, "kitchen"]] as const) {
    const setup = (await candidate.agent.get("/api/setup").expect(200)).body;
    expect(setup).toMatchObject({ configured: true, userId: candidate.id, role, restaurantName: "Test ACL", capabilities: { viewStock: true, receiveOrders: true, validateOrders: role !== "kitchen", manageSettings: role === "owner" } });
    if (role !== "owner") expect(setup).toMatchObject({ step: null, revision: 0 });
    expect((await candidate.agent.get("/api/workspace/catalog").expect(200)).body).toEqual({ products: [], suppliers: [] });
    await candidate.agent.get("/api/workspace/orders").expect(200);
    await candidate.agent.get("/api/workspace/invoices").expect(role === "owner" ? 200 : 403);
  }
  const ownSupplier = randomUUID(), ownProduct = randomUUID();
  await owner.agent.post("/api/workspace/suppliers").send({ id: ownSupplier, name: "Test", email: "supplier@example.test", phone: "" }).expect(201);
  await owner.agent.post("/api/workspace/products").send({ operationId: ownProduct, name: "Test", category: "Test", currentStock: 5, unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId: ownSupplier }).expect(201);
  await chef.agent.post(`/api/workspace/products/${ownProduct}/counts`).send({ operationId: randomUUID(), expectedStockRevision: 1, expectedUnit: "kg", countedQuantity: 4 }).expect(201);
  await kitchen.agent.post(`/api/workspace/products/${ownProduct}/counts`).send({ operationId: randomUUID(), expectedStockRevision: 2, expectedUnit: "kg", countedQuantity: 3 }).expect(201);
  const supplierId = randomUUID();
  await other.agent.post("/api/workspace/suppliers").send({ id: supplierId, name: "Autre", email: "supplier@example.test", phone: "" }).expect(201);
  const foreignId = randomUUID();
  await other.agent.post("/api/workspace/products").send({ operationId: foreignId, name: "Autre", category: "Test", currentStock: 5, unit: "kg", minThreshold: 1, pricePerUnit: 1, supplierId }).expect(201);
  for (const member of [chef, kitchen]) {
    await member.agent.post(`/api/workspace/products/${foreignId}/counts`).send({ operationId: randomUUID(), expectedStockRevision: 1, expectedUnit: "kg", countedQuantity: 2 }).expect(404);
    await member.agent.patch("/api/workspace/restaurant").send({}).expect(403);
    await member.agent.post("/api/workspace/invoices/demo").send({}).expect(403);
    await member.agent.get(`/api/workspace/orders/${randomUUID()}/reconciliation`).expect(403);
    await member.agent.post(`/api/workspace/orders/${randomUUID()}/receipts`).send({}).expect(400);
    await member.agent.post(`/api/workspace/products/${randomUUID()}/counts`).send({}).expect(400);
    await member.agent.get("/api/workspace/orders").set("X-Expected-User-Id", other.id).expect(409);
    await member.agent.post("/api/setup").send({ ...restaurant, expectedUserId: member.id }).expect(409);
  }
  const order = await chef.agent.post("/api/workspace/orders").send({ operationId: randomUUID(), lines: [{ productId: ownProduct, quantity: 2 }] }).expect(201);
  const invoiceId = randomUUID();
  const invoice = await owner.agent.post(`/api/workspace/invoices/${invoiceId}`).send({ revision: 0, receive: false, draft: { reference: "ACL-FACT", date: "2026-11-02", supplierId: ownSupplier, lines: [{ productId: ownProduct, quantity: 2, unit: "kg", unitPrice: 1 }] } }).expect(200);
  const invoiceFixture = (id: string, supplierId: string, productId: string, unit: string, status: "draft" | "received") => ({
    restaurantId: target.id, kind: `invoice:${id}`, data: { id, status, source: "manual", reference: id, date: "2026-11-02", supplierId, lines: [{ productId, quantity: 2, unit, unitPrice: 1 }] },
  });
  await prisma.workspaceDocument.createMany({ data: [
    invoiceFixture(randomUUID(), randomUUID(), ownProduct, "kg", "draft"),
    invoiceFixture(randomUUID(), ownSupplier, randomUUID(), "kg", "draft"),
    invoiceFixture(randomUUID(), ownSupplier, ownProduct, "L", "draft"),
    invoiceFixture(randomUUID(), ownSupplier, ownProduct, "kg", "received"),
  ] });
  const visible = (await kitchen.agent.get(`/api/workspace/orders/${order.body.id}/receipt-invoices`).expect(200)).body;
  expect(visible).toHaveLength(1); expect(visible[0].id).toBe(invoiceId);
  await other.agent.get(`/api/workspace/orders/${order.body.id}/receipt-invoices`).expect(404);
  const chefVisible = (await chef.agent.get(`/api/workspace/orders/${order.body.id}/receipt-invoices`).expect(200)).body;
  expect(chefVisible.map((item: {id: string}) => item.id)).toEqual([invoiceId]);
  await kitchen.agent.post(`/api/workspace/orders/${order.body.id}/receipts`).send({ operationId: randomUUID(), invoiceDocumentId: invoiceId, invoiceDocumentRevision: invoice.body.revision, deliveryReference: "ACL-LIV", deliveryDate: "2026-11-02", lines: [{ invoiceLineIndex: 0, orderLineId: order.body.lines[0].id, receivedQuantity: 2 }] }).expect(201);
  expect((await kitchen.agent.get(`/api/workspace/orders/${order.body.id}/receipt-invoices`).expect(200)).body).toEqual([]);
  expect((await prisma.purchaseReceipt.findFirstOrThrow({ where: { restaurantId: target.id, deliveryReference: "ACL-LIV" } })).actorId).toBe(kitchen.id);
  expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId: target.id, id: ownProduct } } })).currentStock)).toBe(5);
  await chef.agent.post("/api/workspace/orders").send({}).expect(400);
  await kitchen.agent.post("/api/workspace/orders").send({}).expect(403);
  await prisma.membership.delete({ where: { userId: kitchen.id } });
  await kitchen.agent.get("/api/workspace/catalog").expect(409);
  await kitchen.agent.post(`/api/workspace/orders/${randomUUID()}/receipts`).send({}).expect(409);
  expect((await kitchen.agent.get("/api/setup").expect(200)).body).toMatchObject({ configured: false, role: null, restaurantName: null, capabilities: null });
  expect((await other.agent.get("/api/workspace/restaurant").expect(200)).body.name).toBe("Autre");
});
