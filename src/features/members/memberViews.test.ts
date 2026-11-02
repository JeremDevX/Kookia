import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MemberOrders from "./MemberOrders";
import MemberHome from "./MemberHome";

vi.mock("../../context/useCart", () => ({ useCart: () => { throw new Error("Le panier ne doit pas être monté pour cuisine"); } }));

describe("vues membres", () => {
  it("refuse les commandes en cuisine sans accéder au panier", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(MemberOrders, { role: "kitchen" })));
    expect(html).toContain("Accès indisponible");
    expect(html).not.toContain("Revoir la commande");
  });
  it("ne propose que les capacités confirmées", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(MemberHome, { role: "chef", restaurantName: "Restaurant", canStock: true, canReceive: false, canOrder: false })));
    expect(html).toContain("Ouvrir les stocks");
    expect(html).not.toContain("Ouvrir les réceptions");
    expect(html).not.toContain("Préparer une commande");
  });
});
