import { describe, expect, it } from "vitest";
import { isValidISODate } from "./date";

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
