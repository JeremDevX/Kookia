import { expect, it } from "vitest";
import { getOrderView, orderViewHref, purchasePreparationHref } from "./orderNavigation";
import { createOrderRecommendationsFromCartItems } from "./orderRecommendations";

it("opens preparation from the dashboard or an old document/history anchor", () => {
  for (const previous of ["/orders#invoices", "/orders?source=invoice", "/orders#order-123"]) {
    const next = new URL(orderViewHref("prepare"), `http://localhost${previous}`);
    expect(next.pathname + next.search + next.hash).toBe(purchasePreparationHref);
    expect(getOrderView(next.searchParams, next.hash)).toBe("prepare");
    expect(next.searchParams.has("source")).toBe(false);
  }
  expect(getOrderView(new URLSearchParams(), "#purchase-suggestions-title")).toBe("prepare");
  expect(getOrderView(new URLSearchParams(), "#selection")).toBe("prepare");
  expect(getOrderView(new URLSearchParams("source=invoice"), "")).toBe("invoices");
});

it("keeps reviewed recommendations traceable in the final review without treating manual stocks as forecasts", () => {
  const base = { id: "cart-id", productId: "oil", productName: "Huile", quantity: 0.5, source: "dashboard" as const };
  const [suggestion, manual] = createOrderRecommendationsFromCartItems([
    { ...base, purchaseSuggestionOperationId: "decision-id" }, { ...base, source: "stocks" },
  ]);
  expect(suggestion).toMatchObject({ cartId: "cart-id", productId: "oil", quantity: 0.5 });
  expect(suggestion.reason).toContain("Issu des recommandations");
  expect(manual.reason).toContain("pas sur les ventes");
});
