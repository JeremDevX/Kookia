import { Prisma, type PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import { getImpactReport } from "./impactService.js";

it("keeps full-period impact totals while projecting one recorded/simulated monthly page", async () => {
  const december = new Date("2023-12-10T00:00:00.000Z");
  const january = new Date("2024-01-01T00:00:00.000Z");
  const loss = (id: string, createdAt: Date, simulated: boolean) => ({
    id, productId: "tomatoes", delta: new Prisma.Decimal(simulated ? "-0.25" : "-0.5"),
    reason: simulated ? "simulation_loss" : "loss", createdAt,
    actorId: simulated ? "restaurant-simulation:v1" : "restaurant-owner",
    operationId: simulated ? "restaurant-simulation-v1:loss-1" : "recorded-loss-op",
    productNameSnapshot: "Tomates", productUnitSnapshot: "kg", unitPriceSnapshot: new Prisma.Decimal("2"),
    product: { id: "tomatoes", name: "Tomates", unit: "kg" }, purchaseReceiptLine: null,
  });
  const db = {
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
  } as unknown as PrismaClient;

  const report = await getImpactReport("restaurant", "2022-12-01", "2024-01-01", db,
    { includeMonthly: true, monthlyPage: 0 });

  expect(report.current.recorded.menuItemUnits).toBe(4);
  expect(report.current.simulation.menuItemUnits).toBe(3);
  expect(report.current.recorded.receivedCost).toBe(6);
  expect(report.current.recorded.receiptsByProduct).toMatchObject([{ productId: "tomatoes", receivedQuantity: 3,
    cost: 6, receiptIds: ["recorded-receipt"], orderIds: ["recorded-order"] }]);
  expect(report.current.recorded.lossesByProduct).toMatchObject([{ productId: "tomatoes", quantity: 0.5,
    knownCost: 1, operationIds: ["recorded-loss-op"], movementIds: ["recorded-loss"] }]);
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
    recorded: { menuItemUnits: 0, lossMovementCount: 0, receiptCount: 1, receivedCost: 6 },
    simulation: { menuItemUnits: 3, lossMovementCount: 1 } });
});
