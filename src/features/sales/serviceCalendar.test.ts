import { describe, expect, it } from "vitest";
import { qualifiedAllocation } from "../../../shared/serviceCalendar";

describe("qualified service allocation", () => {
  it("keeps legacy daily sales unknown rather than assigning a meal", () => {
    expect(qualifiedAllocation({ quantity: 12, revision: 0 }, null)).toEqual({
      lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 12, needsReview: false,
    });
  });
  it("preserves the unreviewed remainder without double counting", () => {
    expect(qualifiedAllocation({ quantity: 12, revision: 2 }, { lunchQuantity: 5, dinnerQuantity: 4, saleRevision: 2 }))
      .toEqual({ lunchQuantity: 5, dinnerQuantity: 4, unallocatedQuantity: 3, needsReview: false });
  });
  it("invalidates assignments after a correction, even when the new total still fits", () => {
    expect(qualifiedAllocation({ quantity: 15, revision: 3 }, { lunchQuantity: 5, dinnerQuantity: 4, saleRevision: 2 }))
      .toEqual({ lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 15, needsReview: true });
  });
  it("rejects overallocated historical data in the read projection", () => {
    expect(qualifiedAllocation({ quantity: 3, revision: 2 }, { lunchQuantity: 5, dinnerQuantity: 4, saleRevision: 2 }))
      .toEqual({ lunchQuantity: 0, dinnerQuantity: 0, unallocatedQuantity: 3, needsReview: true });
  });
});
