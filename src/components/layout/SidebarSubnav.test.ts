import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SidebarSubnav from "./SidebarSubnav";
import { getOrderView } from "../../features/orders/orderNavigation";

function render(path: string, section: "orders" | "receipts" | "stocks" | "analytics" | "settings" | "recipes") {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] },
    createElement(SidebarSubnav, { section, onNavigate: () => {} })));
}

describe("sous-navigation", () => {
  it("ouvre les ruptures confirmées", () => {
    const html = render("/stocks?stockView=out", "stocks");
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Ruptures confirmées<\/a>/);
  });
  it("identifie la vue mensuelle des réceptions", () => {
    const html = render("/orders?view=receipts&period=month", "receipts");
    expect(html).toContain('href="/orders?view=receipts&amp;period=week"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Mois<\/a>/);
    expect(getOrderView(new URLSearchParams("view=receipts&period=month"), "")).toBe("receipts");
    expect(getOrderView(new URLSearchParams("view=receipts"), "#order-123")).toBe("orders");
  });
  it("identifie la préparation depuis une ancre de commande", () => {
    const html = render("/orders#selection", "orders");
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Préparer un achat<\/a>/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
  it("conserve la période entre bilan et prévisions", () => {
    const html = render("/predictions?from=2026-01-01&to=2026-02-01", "analytics");
    expect(html).toContain('href="/analytics?from=2026-01-01&amp;to=2026-02-01&amp;view=overview"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Prévisions<\/a>/);
  });
  it("préserve le contexte de service dans les paramètres", () => {
    const html = render("/settings?date=2026-11-02&slot=lunch&section=account", "settings");
    expect(html).toContain('href="/settings?date=2026-11-02&amp;slot=lunch&amp;section=restaurant"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Compte<\/a>/);
  });
  it("ouvre les fiches sans conserver un filtre produit", () => {
    const html = render("/recipes?product=p1&incomingReceiptLineId=r1", "recipes");
    expect(html).toContain('href="/recipes?incomingReceiptLineId=r1&amp;view=sheets"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Réalisables avec le stock<\/a>/);
  });
});
