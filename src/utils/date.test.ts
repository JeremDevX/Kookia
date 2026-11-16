import { describe, expect, it } from "vitest";
import { formatLocalISODate, isValidISODate, startOfWeek } from "./date";

describe("isValidISODate", () => {
  it("accepts real calendar dates in the supported format", () => {
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2026-09-26")).toBe(true);
  });

  it("rejects missing, malformed, and impossible dates", () => {
    expect(isValidISODate(null)).toBe(false);
    expect(isValidISODate("2026-9-26")).toBe(false);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
  });
});

it("uses the restaurant date at midnight in Paris, including after a clock change", () => {
  expect(startOfWeek(formatLocalISODate(new Date("2026-03-29T21:59:59Z")))).toBe("2026-03-23");
  expect(startOfWeek(formatLocalISODate(new Date("2026-03-29T22:00:00Z")))).toBe("2026-03-30");
});
