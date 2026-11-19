import { expect, it, vi } from "vitest";
import { saveSaleAllocation } from "./serviceCalendarService.js";

const mocks = vi.hoisted(() => ({
  findSaleAfterCommit: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    dailySale: { findUnique: vi.fn() },
    saleServiceAllocation: { upsert: vi.fn() },
    restaurantServiceSession: { findUnique: vi.fn() },
  },
}));
vi.mock("../../infrastructure/database/prisma.js", () => ({
  prisma: {
    dailySale: { findUnique: mocks.findSaleAfterCommit },
    $transaction: (operation: (tx: typeof mocks.tx) => Promise<unknown>) => operation(mocks.tx),
  },
}));

it("returns the saved allocation even if the sale would be absent in a fresh query", async () => {
  mocks.tx.dailySale.findUnique.mockResolvedValue({
    id: "sale-1", serviceDate: new Date("2026-11-19"), revision: 3, quantity: 12, serviceAllocation: null,
  });
  mocks.tx.saleServiceAllocation.upsert.mockResolvedValue({ lunchQuantity: 5, dinnerQuantity: 4, revision: 1, saleRevision: 3 });
  mocks.tx.restaurantServiceSession.findUnique.mockResolvedValue(null);
  mocks.findSaleAfterCommit.mockResolvedValue(null);

  const saved = await saveSaleAllocation("restaurant-1", "user-1", "sale-1", {
    lunchQuantity: 5, dinnerQuantity: 4, expectedRevision: 0, expectedSaleRevision: 3,
  });

  expect(saved).toEqual({ saleId: "sale-1", lunchQuantity: 5, dinnerQuantity: 4, unallocatedQuantity: 3,
    revision: 1, saleRevision: 3, needsReview: false, previousLunchQuantity: 5, previousDinnerQuantity: 4 });
  expect(mocks.findSaleAfterCommit).not.toHaveBeenCalled();
});
