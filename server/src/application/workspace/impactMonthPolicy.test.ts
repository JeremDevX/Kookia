import { describe, expect, it } from "vitest";
import { impactMonthCount, impactMonthPage, impactMonthPageCount } from "./impactMonthPolicy.js";

describe("impactMonthPage", () => {
  it("pages a deep period from newest to oldest without losing partial boundary months", () => {
    const from = "2020-01-15";
    const to = "2026-09-26";
    expect(impactMonthCount(from, to)).toBe(81);
    expect(impactMonthPageCount(from, to)).toBe(7);
    const latestPage = impactMonthPage(from, to, 0);
    expect(latestPage).toMatchObject({ page: 0, pageCount: 7, totalMonths: 81, hasOlder: true, hasNewer: false });
    expect(latestPage.ranges[0]).toMatchObject({ month: "2025-10", from: "2025-10-01" });
    expect(latestPage.ranges[11]).toMatchObject({ month: "2026-09", to: "2026-09-26" });
    const oldestPage = impactMonthPage(from, to, 6);
    expect(oldestPage).toMatchObject({ page: 6, hasOlder: false, hasNewer: true });
    expect(oldestPage.ranges[0]).toMatchObject({ month: "2020-01", from: "2020-01-15" });
    expect(oldestPage.ranges[8]).toMatchObject({ month: "2020-09", to: "2020-09-30" });
  });

  it("rejects an invalid date order and pages outside the selected range", () => {
    expect(() => impactMonthPage("2026-02-01", "2026-01-31", 0)).toThrow(RangeError);
    expect(() => impactMonthPage("2020-01-01", "2024-01-01", 5)).toThrow(RangeError);
  });
});
