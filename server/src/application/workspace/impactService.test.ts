import { Prisma, type PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import { getImpactMonthlyPage, getImpactReport } from "./impactService.js";

const impactDb = () => {
  const december = new Date("2023-12-10T00:00:00.000Z");
  const january = new Date("2024-01-01T00:00:00.000Z");
  const loss = (id: string, createdAt: Date, simulated: boolean) => ({
    id, productId: "tomatoes", delta: new Prisma.Decimal(simulated ? "-0.25" : "-0.5"),
    reason: simulated ? "simulation_loss" : "loss", createdAt,
    actorId: simulated ? "restaurant-simulation:v1" : "restaurant-owner",
    operationId: simulated ? "restaurant-simulation-v1:loss-1" : `${id}-op`,
    productNameSnapshot: "Tomates", productUnitSnapshot: "kg", unitPriceSnapshot: new Prisma.Decimal("2"),
    product: { id: "tomatoes", name: "Tomates", unit: "kg" }, purchaseReceiptLine: null,
  });
  const typedLoss = loss("typed-loss", new Date("2024-02-15T00:00:00.000Z"), false);
  return {
    wasteRecord: { findMany: vi.fn().mockResolvedValue([{
      id: "declared-loss", operationId: typedLoss.operationId, serviceDate: january, serviceSlot: "lunch",
      kind: "raw", avoidability: "avoidable", productId: typedLoss.productId, product: typedLoss.product,
      productionId: null, production: null, lotId: "lot", quantity: new Prisma.Decimal("0.5"), unit: "kg",
      note: "", stockMovementId: typedLoss.id, stockMovement: { ...typedLoss,
        lotAllocations: [{ quantity: new Prisma.Decimal("0.5"), lot: { unitCost: new Prisma.Decimal("8") } }],
      },
    }]) },
    restaurant: { findUnique: vi.fn().mockResolvedValue({ mode: "operational" }) },
    serviceDay: { findMany: vi.fn().mockResolvedValue([
      { serviceDate: december, status: "open", coverage: "complete", source: "manual" },
      { serviceDate: january, status: "open", coverage: "complete", source: "demo_simulation" },
    ]) },
    dailySale: { findMany: vi.fn().mockResolvedValue([
      { serviceDate: december, source: "manual", serviceDay: { source: "manual" }, quantity: 4,
        saleItemId: "recorded-item", saleItem: { id: "recorded-item", name: "Plat enregistré" }, operationId: "recorded-op" },
      { serviceDate: january, source: "demo_simulation", serviceDay: { source: "demo_simulation" }, quantity: 3,
        saleItemId: "simulated-item", saleItem: { id: "simulated-item", name: "Plat simulé" }, operationId: "simulated-op" },
    ]) },
    stockMovement: { findMany: vi.fn().mockResolvedValue([
      loss("recorded-loss", december, false), loss("simulated-loss", january, true),
    ]) },
    purchaseReceiptLine: { findMany: vi.fn().mockResolvedValue([{
      productId: "tomatoes", productName: "Tomates", unit: "kg", receivedQuantity: new Prisma.Decimal("3"),
      invoiceUnitPrice: new Prisma.Decimal("2"), product: { unit: "kg" },
      receipt: { deliveryDate: january, simulated: false, id: "recorded-receipt", orderId: "recorded-order" },
    }]) },
  };
};

it("keeps full-period impact totals while projecting one recorded/simulated monthly page", async () => {
  const report = await getImpactReport("restaurant", "2022-12-01", "2024-01-01", impactDb() as unknown as PrismaClient,
    { includeMonthly: true, monthlyPage: 0 });

  expect(report.current.recorded.menuItemUnits).toBe(4);
  expect(report.current.simulation.menuItemUnits).toBe(3);
  expect(report.current.recorded.receivedCost).toBe(6);
  expect(report.current.recorded.receiptsByProduct).toMatchObject([{ productId: "tomatoes", receivedQuantity: 3,
    cost: 6, receiptIds: ["recorded-receipt"], orderIds: ["recorded-order"] }]);
  expect(report.current.recorded.lossesByProduct).toMatchObject([{ productId: "tomatoes", quantity: 1,
    knownCost: 5, operationIds: ["recorded-loss-op", "typed-loss-op"], movementIds: ["recorded-loss", "typed-loss"] }]);
  expect(report.current.simulation.lossesByProduct).toMatchObject([{ quantity: 0.25, knownCost: 0.5,
    movementIds: ["simulated-loss"] }]);
  expect(report.current.excluded.simulatedLosses).toBe(1);
  if (!("monthly" in report) || !report.monthlyPagination) throw new Error("Monthly detail was not returned.");
  expect(report.monthlyPagination).toMatchObject({ page: 0, pageCount: 2, totalMonths: 14,
    hasOlder: true, hasNewer: false });
  expect(report.monthly).toHaveLength(12);
  expect(report.monthly?.find((period) => period.month === "2023-12")).toMatchObject({
    recorded: { menuItemUnits: 4, lossMovementCount: 1 }, simulation: { menuItemUnits: 0, lossMovementCount: 0 } });
  expect(report.monthly?.find((period) => period.month === "2024-01")).toMatchObject({
    month: "2024-01", from: "2024-01-01", to: "2024-01-01",
    hasRecordedData: true, hasSimulationData: true,
    recorded: { menuItemUnits: 0, lossMovementCount: 1, knownLossCost: 4, receiptCount: 1, receivedCost: 6,
      serviceDays: { complete: 0, unregistered: 1 },
      declaredWaste: { records: [{ id: "declared-loss", serviceDate: "2024-01-01", knownCost: 4 }] } },
    simulation: { menuItemUnits: 3, lossMovementCount: 1, serviceDays: { complete: 1, unregistered: 0 } } });
});

it("loads only the requested monthly page with a bounded query for each source", async () => {
  const db = impactDb();
  const report = await getImpactMonthlyPage("restaurant", "2020-12-10", "2024-01-01", 0, db as unknown as PrismaClient);
  const dateWindow = { gte: new Date("2023-02-01T00:00:00.000Z"), lt: new Date("2024-01-02T00:00:00.000Z") };
  const queries = [
    [db.serviceDay.findMany, { serviceDate: dateWindow }],
    [db.dailySale.findMany, { serviceDate: dateWindow }],
    [db.stockMovement.findMany, { createdAt: dateWindow, wasteRecord: null }],
    [db.purchaseReceiptLine.findMany, { receipt: { deliveryDate: dateWindow } }],
    [db.wasteRecord.findMany, { serviceDate: dateWindow }],
  ] as const;
  for (const [query, filter] of queries) {
    expect(query).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: expect.objectContaining({ restaurantId: "restaurant", ...filter }),
    }));
  }
  expect(Object.keys(report).sort()).toEqual(["currency", "monthly", "monthlyPagination"]);
  expect(report.monthly).toHaveLength(12);
  expect(report.monthly[0]).toMatchObject({ month: "2023-02", hasRecordedData: false });
  expect(report.monthly[10]).toMatchObject({ month: "2023-12", recorded: { menuItemUnits: 4, knownLossCost: 1 } });
  expect(report.monthly[11]).toMatchObject({ month: "2024-01", calendarDays: 1,
    recorded: { knownLossCost: 4, receivedCost: 6 }, simulation: { menuItemUnits: 3, knownLossCost: 0.5 } });
});

it("uses the same unrounded receipt costs for the period total and product totals", async () => {
  const db = impactDb();
  db.purchaseReceiptLine.findMany.mockResolvedValue(["0.003", "0.022"].map((price, index) => ({
    productId: "tomatoes", productName: "Tomates", unit: "kg", receivedQuantity: new Prisma.Decimal(1),
    invoiceUnitPrice: new Prisma.Decimal(price), product: { unit: "kg" },
    receipt: { deliveryDate: new Date("2024-01-01"), simulated: false, id: `receipt-${index}`, orderId: `order-${index}` },
  })));
  const report = await getImpactReport("restaurant", "2024-01-01", "2024-01-01", db as unknown as PrismaClient);
  expect(report.current.recorded).toMatchObject({ receivedCost: 0.025, receiptsByProduct: [{ cost: 0.025 }] });
});
