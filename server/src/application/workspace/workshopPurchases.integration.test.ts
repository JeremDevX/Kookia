import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { prisma } from "../../infrastructure/database/prisma.js";
import { getInvoices } from "./invoiceReadService.js";
import { listPurchaseOrders } from "./purchaseOrderReadService.js";
import { applyWorkshopPurchases } from "./workshopPurchases.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";

type Purchase = WorkshopOperationsInput["purchases"][number];
const ownerIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  await prisma.$disconnect();
});

async function fixture() {
  const email = `workshop-purchases-fixture-${randomUUID()}@example.com`;
  const owner = await prisma.user.create({ data: { displayName: "Fixture", email, emailNormalized: email, passwordHash: "fixture" } });
  ownerIds.push(owner.id);
  const restaurant = await prisma.restaurant.create({ data: {
    ownerId: owner.id, mode: "operational", name: "Fixture", type: "Restaurant", address: "", city: "", phone: "", email: "", dailyCovers: 40,
  } });
  await prisma.supplier.create({ data: { restaurantId: restaurant.id, id: "supplier", name: "Les Jardins", phone: "", email: "" } });
  await prisma.product.create({ data: { restaurantId: restaurant.id, id: "pears", supplierId: "supplier", name: "Poires",
    category: "Fruits", unit: "kg", currentStock: 2, minThreshold: 1, pricePerUnit: 2.69 } });
  return { restaurantId: restaurant.id, actorId: owner.id };
}

const pending: Purchase = { reference: "BC-2026-06-08-1-MARA", supplier: "Les Jardins", orderedOn: "2026-06-08",
  expectedOn: "2026-06-09", receipt: null,
  lines: [{ name: "Poires", unit: "kg", orderedMilli: 4000, receivedMilli: 0, unitPriceCents: 329 }] };

const received = (receivedMilli: number): Purchase => ({ ...pending, receipt: {
  deliveryReference: "BL-2026-06-08-1-MARA", invoiceReference: "FA-2026-06-08-1-MARA", invoiceOn: "2026-06-10",
}, lines: [{ ...pending.lines[0], receivedMilli }] });
const apply = (restaurantId: string, date: string, purchase: Purchase) => prisma.$transaction(tx =>
  applyWorkshopPurchases(tx, restaurantId, date, [purchase]));

it("writes native simulated purchases, invoice quantities and actual receipt quantities without touching stock", async () => {
  const { restaurantId } = await fixture();
  const other = await fixture();
  await apply(restaurantId, pending.orderedOn, pending);
  const [order] = await listPurchaseOrders(restaurantId);
  expect(order).toMatchObject({ status: "simulated", createdAt: "2026-06-08T12:00:00.000Z",
    lines: [{ productId: "pears", quantity: 4, remainingQuantity: 4, pricePerUnit: 3.29 }], receipts: [] });
  await apply(restaurantId, pending.expectedOn, received(3500));
  await apply(restaurantId, pending.expectedOn, received(3500));
  await expect(apply(restaurantId, pending.expectedOn, received(4000))).rejects.toMatchObject({ code: "WORKSHOP_PURCHASE_CONFLICT" });

  expect(await listPurchaseOrders(restaurantId)).toEqual([expect.objectContaining({ id: order.id, status: "simulated_partially_received",
    lines: [expect.objectContaining({ quantity: 4, receivedQuantity: 3.5, remainingQuantity: 0.5 })],
    receipts: [expect.objectContaining({ simulated: true, provenance: "demo_simulation", invoiceComplete: false, deliveryDate: pending.expectedOn,
      lines: [expect.objectContaining({ orderedQuantity: 4, invoiceQuantity: 4, receivedQuantity: 3.5, quantityDifference: 0.5, stockMovementId: null })] })],
  })]);
  expect(await getInvoices(restaurantId)).toEqual([expect.objectContaining({ source: "demo", provenance: "demo_simulation", stockEffect: "none",
    status: "draft", reference: "FA-2026-06-08-1-MARA", date: "2026-06-10",
    lines: [{ productId: "pears", quantity: 4, unit: "kg", unitPrice: 3.29 }] })]);
  expect(await listPurchaseOrders(other.restaurantId)).toEqual([]);
  expect(await getInvoices(other.restaurantId)).toEqual([]);
  expect((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: "pears" } } })).currentStock.toNumber()).toBe(2);
  expect(await prisma.stockMovement.count({ where: { restaurantId } })).toBe(0);
  expect(await prisma.stockLot.count({ where: { restaurantId } })).toBe(0);
});

it("only adopts an exact legacy purchase and preserves its order facts while linking a simulated receipt", async () => {
  const { restaurantId, actorId } = await fixture();
  const legacy = await prisma.purchaseOrder.create({ data: { restaurantId, actorId, operationId: randomUUID(), status: "validated",
    lines: { create: [{ productId: "pears", productName: "Poires", supplierId: "supplier", supplierName: "Les Jardins",
      quantity: 4, unit: "kg", pricePerUnit: 2.69, expectedDeliveryDate: new Date(pending.expectedOn),
      deliveryNote: `${pending.reference} du ${pending.orderedOn}. Bon source.` }] },
  }, include: { lines: true } });
  const full = received(4000);
  await expect(apply(restaurantId, pending.expectedOn, { ...full,
    lines: [{ ...full.lines[0], orderedMilli: 5000 }] })).rejects.toMatchObject({ code: "WORKSHOP_PURCHASE_CONFLICT" });
  expect((await listPurchaseOrders(restaurantId))[0]).toMatchObject({ id: legacy.id, status: "validated", receipts: [] });

  await apply(restaurantId, pending.expectedOn, full);
  await apply(restaurantId, pending.expectedOn, full);
  const orders = await listPurchaseOrders(restaurantId);
  expect(orders).toEqual([expect.objectContaining({ id: legacy.id, createdAt: legacy.createdAt.toISOString(), status: "simulated_received",
    lines: [expect.objectContaining({ id: legacy.lines[0].id, pricePerUnit: 2.69 })],
    receipts: [expect.objectContaining({ simulated: true, invoiceComplete: true, lines: [expect.objectContaining({
      orderedUnitPrice: 2.69, invoiceUnitPrice: 3.29, priceDifferenceReason: expect.any(String), stockMovementId: null,
    })] })] })]);
  expect(await getInvoices(restaurantId)).toEqual([expect.objectContaining({ status: "received", stockEffect: "none" })]);
  expect(await prisma.stockMovement.count({ where: { restaurantId } })).toBe(0);
});
