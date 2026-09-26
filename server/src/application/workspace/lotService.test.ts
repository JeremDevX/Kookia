import { describe, expect, it } from "vitest";
import { fefoOrder } from "./lotService.js";
import { wasteDeductsStock } from "./wasteService.js";
describe("FEFO", () => {
  it("prioritises known expiry, then receipt date; unknown never gets invented", () => {
    const rows = [
      { id: "unknown", expiresAt: null, receivedAt: null },
      { id: "dated", expiresAt: null, receivedAt: new Date("2026-01-01") },
      { id: "later", expiresAt: new Date("2026-02-02"), receivedAt: new Date("2026-01-01") },
      { id: "soon", expiresAt: new Date("2026-02-01"), receivedAt: new Date("2026-01-03") },
    ];
    expect(fefoOrder(rows).map((row) => row.id)).toEqual(["soon", "later", "dated", "unknown"]);
    expect(rows[0].receivedAt).toBeNull(); expect(rows[0].expiresAt).toBeNull();
  });
});
describe("waste stock policy", () => {
  it("deducts raw material but never re-deducts a validated preparation", () => {
    expect(wasteDeductsStock("raw")).toBe(true);
    expect(wasteDeductsStock("preparation")).toBe(true);
    expect(wasteDeductsStock("preparation", "validated-production")).toBe(false);
    expect(wasteDeductsStock("unsold", "validated-production")).toBe(false);
    expect(wasteDeductsStock("plate_return", "validated-production")).toBe(false);
  });
});
