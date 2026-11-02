import { describe, expect, it } from "vitest";
import { returnTo } from "./returnTo";

describe("returnTo", () => {
  it("preserves the complete protected location", () => {
    expect(returnTo({ from: { pathname: "/orders", search: "?view=week", hash: "#selection" } })).toBe("/orders?view=week#selection");
  });

  it("falls back to the home page for external or invalid destinations", () => {
    for (const pathname of ["https://example.com", "//example.com", "/\\example.com", "/orders?next=//example.com"]) {
      expect(returnTo({ from: { pathname } })).toBe("/");
    }
    expect(returnTo(null)).toBe("/");
    expect(returnTo({ from: { pathname: "/orders", search: "bad", hash: "bad" } })).toBe("/orders");
  });
});
