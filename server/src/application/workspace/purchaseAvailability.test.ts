import { expect, it } from "vitest";
import { purchaseAvailability } from "./purchaseAvailability.js";
it("excludes expired quantities and consumes dated lots FEFO without treating unknown expiry as observed freshness", () => {
  expect(purchaseAvailability(12, [{ quantity: 3, expiresAt: "2026-09-26" }, { quantity: 5, expiresAt: "2026-09-27" }],
    [{ date: "2026-09-27", quantity: 4 }, { date: "2026-09-28", quantity: 6 }], [], "2026-09-27", "2026-09-27")).toMatchObject({
    usableStock: 9, expiredQuantity: 3, unknownExpiryQuantity: 4, netNeed: 2, conditionalNetNeed: 2, purchasableNeed: 2,
  });
});
it("does not use a later arrival for earlier services and exposes the unresolved shortage before the next delivery", () => {
  expect(purchaseAvailability(0, [], [{ date: "2026-09-27", quantity: 4 }, { date: "2026-09-28", quantity: 6 }],
    [{ date: "2026-09-28", quantity: 6 }], "2026-09-27", "2026-09-28")).toMatchObject({
    conditionalNetNeed: 4, beforeDeliveryShortage: 4, purchasableNeed: 0, shortages: [{ date: "2026-09-27", quantity: 4 }],
  });
});
it("rejects lot coverage above the current count and does not reuse overdue arrivals", () => {
  expect(purchaseAvailability(1, [{ quantity: 2, expiresAt: null }], [], [], "2026-09-27", "2026-09-28").lotMismatch).toBe(true);
  expect(purchaseAvailability(0, [], [{ date: "2026-09-27", quantity: 2 }], [{ date: "2026-09-26", quantity: 2 }], "2026-09-27", "2026-09-28").netNeed).toBe(2);
});
