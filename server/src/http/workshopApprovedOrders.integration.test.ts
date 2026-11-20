import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";
import { addCalendarDays } from "../../../shared/calendarDate.js";
import { formatParisDate } from "../../../shared/parisDate.js";
import { workshopApprovedPurchaseReference } from "../../../shared/workshopOrders.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { createApp } from "./app.js";

const ownerIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  await prisma.$disconnect();
});

it("follows a human-approved workshop suggestion, receiving each part exactly once", async () => {
  const today = formatParisDate();
  const date = (offset: number) => addCalendarDays(today, offset);
  const restaurantId = randomUUID();
  const token = "test-workshop-orders-".repeat(3);
  const previous = { WORKSHOP_IMPORT_RESTAURANT_ID: env.WORKSHOP_IMPORT_RESTAURANT_ID,
    WORKSHOP_IMPORT_TOKEN: env.WORKSHOP_IMPORT_TOKEN, WORKSHOP_FORECAST_ENABLED: env.WORKSHOP_FORECAST_ENABLED,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: env.WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE,
    WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM: env.WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM };
  Object.assign(env, { WORKSHOP_IMPORT_RESTAURANT_ID: restaurantId, WORKSHOP_IMPORT_TOKEN: token,
    WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE: "true", WORKSHOP_FORECAST_ENABLED: "true",
    WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM: date(-1) });
  const app = createApp();
  const workshop = request(app);
  const api = "/api/integrations/workshop";
  const importDay = (day: string) => workshop.put(`${api}/days/${day}`).set("Authorization", `Bearer ${token}`);
  const dueOrders = (day: string) => workshop.get(`${api}/approved-orders/${day}`).set("Authorization", `Bearer ${token}`);
  const owner = request.agent(app);
  try {
    const account = await owner.post("/api/auth/register").send({ displayName: "Atelier", email: `${randomUUID()}@example.com`,
      password: "isolated workshop password" }).expect(201);
    const ownerId: string = account.body.user.id;
    ownerIds.push(ownerId);
    owner.set("X-Expected-User-Id", ownerId);
    await prisma.restaurant.create({ data: { id: restaurantId, ownerId, mode: "demo", name: "Atelier", type: "Restaurant",
      address: "", city: "", phone: "", email: "", dailyCovers: 40 } });
    const supplier = { id: "market", name: "Les Jardins du Levant" };
    const product = { id: "tomate", name: "Tomates", unit: "kg" };
    await prisma.supplier.create({ data: { ...supplier, restaurantId, email: "", phone: "",
      deliveryWeekdays: [0, 1, 2, 3, 4, 5, 6], leadTimeDays: 0, orderCutoffTime: "23:59" } });
    await prisma.product.create({ data: { ...product, restaurantId, supplierId: supplier.id, category: "Légumes",
      currentStock: 0, minThreshold: 0, pricePerUnit: 3.8, orderPackQuantity: 1 } });
    await owner.post(`/api/workspace/products/${product.id}/counts`).send({ operationId: randomUUID(),
      expectedStockRevision: 1, expectedUnit: "kg", countedQuantity: 0 }).expect(201);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${today}T10:00:00Z`));
    const baseStock = { name: product.name, unit: product.unit, supplier: supplier.name };
    const day = { open: false, sales: [], operations: { purchases: [], services: [], losses: [], incident: "normal", events: [] } };
    await importDay(date(-1)).send({ ...day, stock: [{ ...baseStock, lots: [] }] }).expect(200);
    await workshop.put(`${api}/forecast/${today}`).set("Authorization", `Bearer ${token}`).send({
      provenance: "demo_simulation", date: today, basedOnDate: date(-1), covers: 0, revenueCents: 0, hours: [], products: [],
      purchaseNeeds: [today, date(1), date(2)].map(day => ({ date: day, products: [{ ...baseStock, quantityMilli: 5000 }] })),
    }).expect(200);
    await workshop.get(`${api}/approved-orders/${date(-1)}`).expect(401);
    await dueOrders(today).expect(400);
    const suggestions = await owner.get("/api/workspace/orders/suggestions").expect(200);
    expect(suggestions.body).toMatchObject({ provenance: "demo_simulation",
      suggestions: [{ productId: product.id, estimatedQuantity: 5, canAdd: true }] });
    const { suggestionKey } = suggestions.body.suggestions[0];
    const cartId = randomUUID();
    const added = await owner.post(`/api/workspace/orders/suggestions/${product.id}/decision`).send({
      operationId: randomUUID(), suggestionKey, decision: "added", quantity: 5,
    }).expect(201);
    await owner.post("/api/workspace/cart").send({ action: "add", items: [{ id: cartId, productId: product.id,
      productName: product.name, quantity: 5, unit: product.unit, source: "dashboard",
      purchaseSuggestionOperationId: added.body.operationId,
    }] }).expect(200);
    vi.setSystemTime(new Date(`${date(2)}T10:00:00Z`));
    await dueOrders(date(1)).expect(200, []);
    vi.setSystemTime(new Date(`${today}T10:00:00Z`));
    const order = await owner.post("/api/workspace/orders").send({ operationId: randomUUID(),
      lines: [{ productId: product.id, cartId, quantity: 4 }],
    }).expect(201);
    const orderId: string = order.body.id, lineId: string = order.body.lines[0].id;
    expect(order.body).toMatchObject({ status: "simulated", lines: [{ quantity: 4, expectedDeliveryDate: date(1) }] });
    expect(await prisma.purchaseReceipt.count({ where: { restaurantId } })).toBe(0);

    vi.setSystemTime(new Date(`${date(3)}T10:00:00Z`));
    await dueOrders(today).expect(200, []);
    await importDay(today).send({ ...day, stock: [{ ...baseStock, lots: [] }] }).expect(200);
    const arrival = { ...baseStock, orderId, lineId, orderedOn: today, dueOn: date(1), quantityMilli: 4000, unitPriceCents: 380 };
    await dueOrders(date(1)).expect(200, [arrival]);

    const receiptBody = (dayOffset: number, remaining: number, received: number) => {
      const target = date(dayOffset);
      const reference = workshopApprovedPurchaseReference(target, lineId);
      const lot = { reference: `LOT-${reference}`, receivedOn: target, expiresOn: date(dayOffset + 3),
        unitCostCents: 380, openingMilli: 0, addedMilli: received, closingMilli: received, lossMilli: 0, addition: "delivery" as string | null };
      return { ...day, stock: [{ ...baseStock, lots: [lot] }], operations: { ...day.operations,
        purchases: [{ approvedOrderId: orderId, reference, supplier: supplier.name, orderedOn: today, expectedOn: target,
          receipt: { deliveryReference: `BL-${reference.slice(3)}`, invoiceReference: `FA-${reference.slice(3)}`, invoiceOn: date(dayOffset + 1) },
          lines: [{ approvedLineId: lineId, name: product.name, unit: product.unit, orderedMilli: remaining, receivedMilli: received, unitPriceCents: 380 }],
        }],
      } };
    };
    const partial = receiptBody(1, 4000, 2000);
    await importDay(date(1)).send({ ...partial, operations: { ...partial.operations, purchases: [
      { ...partial.operations.purchases[0], approvedOrderId: randomUUID() },
    ] } }).expect(409);
    expect(await prisma.stockMovement.count({ where: { restaurantId, reason: "simulation_restock" } })).toBe(0);
    await importDay(date(1)).send(partial).expect(200);
    await importDay(date(1)).send(partial).expect(200, { date: date(1), replayed: true, saleCount: 0, stockApplied: true, operationsApplied: true });
    const afterPartial = await owner.get("/api/workspace/orders").expect(200);
    expect(afterPartial.body).toMatchObject([{ id: orderId, status: "simulated_partially_received",
      lines: [{ quantity: 4, remainingQuantity: 2 }], receipts: [{ simulated: true, lines: [{ receivedQuantity: 2,
        stockMovementId: expect.any(String) }] }] }]);
    await dueOrders(date(2)).expect(200, [{ ...arrival, dueOn: date(2), quantityMilli: 2000 }]);

    const rest = receiptBody(2, 2000, 2000);
    rest.stock[0].lots.unshift({ ...partial.stock[0].lots[0], openingMilli: 2000, addedMilli: 0, addition: null });
    await importDay(date(2)).send(rest).expect(200);
    await dueOrders(date(2)).expect(200, []);
    const complete = await owner.get("/api/workspace/orders").expect(200);
    expect(complete.body).toMatchObject([{ id: orderId, status: "simulated_received", lines: [{ quantity: 4, remainingQuantity: 0 }] }]);
    expect(await prisma.purchaseReceipt.count({ where: { restaurantId, orderId, simulated: true } })).toBe(2);
    expect(await prisma.stockLot.count({ where: { restaurantId, productId: product.id, purchaseReceiptLineId: { not: null } } })).toBe(2);
    expect(await prisma.stockMovement.count({ where: { restaurantId, reason: "simulation_restock" } })).toBe(2);
    const stock = await prisma.product.findFirstOrThrow({ where: { restaurantId, id: product.id } });
    expect(Number(stock.currentStock)).toBe(4);

    await prisma.restaurant.update({ where: { id: restaurantId }, data: { mode: "operational" } });
    await dueOrders(date(2)).expect(403);
    await importDay(date(2)).send(rest).expect(403);
  } finally {
    vi.useRealTimers();
    Object.assign(env, previous);
  }
});
