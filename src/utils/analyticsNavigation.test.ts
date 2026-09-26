import { describe, expect, it } from "vitest";
import { analyticsReturnHref, receiptDetailsHref, stockMovementHref } from "./analyticsNavigation";

describe("analytics source navigation", () => {
  it("opens the exact receipt and carries its source period and return section", () => {
    const href = receiptDetailsHref("receipt/one", "2026-09-01", "2026-09-26", "impact-summary-title");
    const url = new URL(href, "https://kookia.test");
    expect(url.pathname).toBe("/orders");
    expect(url.searchParams.get("receiptId")).toBe("receipt/one");
    expect(url.searchParams.get("from")).toBe("2026-09-01");
    expect(url.searchParams.get("to")).toBe("2026-09-26");
    expect(url.searchParams.get("returnAnchor")).toBe("impact-summary-title");
    expect(url.hash).toBe("#receipt-receipt%2Fone");
  });

  it("returns only to a recognized section and a valid, ordered date range", () => {
    expect(analyticsReturnHref("2026-09-01", "2026-09-26", "impact-summary-title"))
      .toBe("/analytics?from=2026-09-01&to=2026-09-26#impact-summary-title");
    expect(analyticsReturnHref("2026-09-26", "2026-09-01", "impact-summary-title")).toBeUndefined();
    expect(analyticsReturnHref("2026-02-31", "2026-09-26", "impact-summary-title")).toBeUndefined();
    expect(analyticsReturnHref("2026-09-01", "2026-09-26", "https://outside.test")).toBeUndefined();
  });

  it("opens a precise stock movement and carries a safe return to the same impact period", () => {
    const href = stockMovementHref("product/one", "movement one", "2026-09-01", "2026-09-26");
    const url = new URL(href, "https://kookia.test");
    expect(url.pathname).toBe("/stocks");
    expect(url.searchParams.get("product")).toBe("product/one");
    expect(url.searchParams.get("movement")).toBe("movement one");
    expect(url.searchParams.get("returnFrom")).toBe("2026-09-01");
    expect(url.searchParams.get("returnTo")).toBe("2026-09-26");
    expect(url.searchParams.get("returnAnchor")).toBe("impact-summary-title");
    expect(url.hash).toBe("#stock-movement-movement%20one");
    expect(new URL(stockMovementHref("product", "movement", "invalid", "2026-09-26"), "https://kookia.test")
      .searchParams.has("returnFrom")).toBe(false);
  });

  it("preserves the estimation section when a receipt leads to its exact stock movement", () => {
    const href = stockMovementHref("product", "movement", "2026-09-01", "2026-09-26", "estimated-outflows-title");
    const url = new URL(href, "https://kookia.test");
    expect(url.searchParams.get("returnAnchor")).toBe("estimated-outflows-title");
    expect(analyticsReturnHref(url.searchParams.get("returnFrom"), url.searchParams.get("returnTo"),
      url.searchParams.get("returnAnchor"))).toBe("/analytics?from=2026-09-01&to=2026-09-26#estimated-outflows-title");
  });
});
