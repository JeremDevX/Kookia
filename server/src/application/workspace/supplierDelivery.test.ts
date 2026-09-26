import { describe, expect, it } from "vitest";
import { supplierDeliveryHorizon } from "../../../../shared/supplierDelivery.js";

describe("supplier delivery horizon", () => {
  const supplier = { deliveryWeekdays: [1, 4], leadTimeDays: 1, orderCutoffTime: "12:00" };
  it("uses Paris cutoff and spans through the day before the following delivery", () => {
    expect(supplierDeliveryHorizon(supplier, new Date("2026-09-27T09:00:00Z"))).toMatchObject({
      status: "known", orderDate: "2026-09-27", nextDeliveryDate: "2026-09-28", followingDeliveryDate: "2026-10-01", throughDate: "2026-09-30",
    });
    expect(supplierDeliveryHorizon(supplier, new Date("2026-09-27T10:00:00Z"))).toMatchObject({
      status: "known", orderDate: "2026-09-28", nextDeliveryDate: "2026-10-01", throughDate: "2026-10-04",
    });
  });
  it("handles winter Paris time without adding elapsed hours across DST", () => {
    expect(supplierDeliveryHorizon({ ...supplier, deliveryWeekdays: [0], leadTimeDays: 0 }, new Date("2026-10-25T10:59:00Z"))).toMatchObject({
      status: "known", nextDeliveryDate: "2026-10-25", throughDate: "2026-10-31",
    });
  });
  it("does not invent missing or invalid constraints", () => {
    expect(supplierDeliveryHorizon({}, new Date())).toMatchObject({ status: "unknown" });
    expect(supplierDeliveryHorizon({ ...supplier, deliveryWeekdays: [7] }, new Date())).toMatchObject({ status: "unknown" });
  });
});
