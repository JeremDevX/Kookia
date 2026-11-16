import { createElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceHome, WorkspaceLayout, WorkspaceOrders, WorkspaceStocks, OwnerOnly } from "./WorkspaceLayout";

const state = vi.hoisted(() => ({ role: "kitchen" as "owner" | "chef" | "kitchen" }));
vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(),
  useOutletContext: () => ({ role: state.role, restaurantName: "Mon restaurant", capabilities: { viewStock: true, countStock: true, receiveOrders: true, validateOrders: state.role !== "kitchen", manageSettings: state.role === "owner" } }),
}));
vi.mock("../../components/layout/Layout", () => ({ default: () => createElement("p", null, "Cadre propriétaire") }));
vi.mock("../../context/CartContext", () => ({ CartProvider: ({ children }: { children: ReactNode }) => createElement("div", { "data-cart": "mounted" }, children) }));
vi.mock("../auth/context/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock("./MemberStocks", () => ({ default: () => createElement("p", null, "Stocks limités") }));
vi.mock("./MemberReceipts", () => ({ default: () => createElement("p", null, "Réceptions limitées") }));
vi.mock("./MemberOrders", () => ({ default: () => createElement("p", null, "Commandes chef") }));
const render = async (path: string) => {
  const { prelude } = await prerender(createElement(MemoryRouter, { initialEntries: [path] },
    createElement(Routes, null, createElement(Route, { path: "/", element: createElement(WorkspaceLayout) },
      createElement(Route, { index: true, element: createElement(WorkspaceHome, { owner: "Accueil propriétaire" }) }),
      createElement(Route, { path: "stocks", element: createElement(WorkspaceStocks, { owner: "Stocks propriétaire" }) }),
      createElement(Route, { path: "orders", element: createElement(WorkspaceOrders, { owner: "Commandes propriétaire" }) }),
      createElement(Route, { path: "settings", element: createElement(OwnerOnly, null, "Paramètres propriétaire") })))));
  return new Response(prelude).text();
};
beforeEach(() => { state.role = "kitchen"; });
describe("accès espace membre", () => {
  it("n’installe pas le panier pour cuisine et limite sa navigation", async () => {
    const html = await render("/");
    expect(html).toContain("Mon restaurant");
    expect(html).toContain("Ouvrir les stocks");
    expect(html).not.toContain("Préparer une commande");
    expect(html).not.toContain('data-cart="mounted"');
  });
  it("refuse les accès directs de cuisine aux commandes et paramètres", async () => {
    expect(await render("/orders?view=prepare")).toContain("Accès indisponible");
    expect(await render("/settings")).toContain("Accès indisponible");
    expect(await render("/stocks")).toContain("Stocks limités");
    expect(await render("/orders?view=receipts")).toContain("Réceptions limitées");
  });
  it("monte le panier et la commande pour chef", async () => {
    state.role = "chef";
    const html = await render("/orders?view=prepare");
    expect(html).toContain('data-cart="mounted"');
    expect(html).toContain("Commandes chef");
    expect(await render("/settings")).toContain("Accès indisponible");
  });
  it("préserve le cadre propriétaire", async () => {
    state.role = "owner";
    const html = await render("/");
    expect(html).toContain('data-cart="mounted"');
    expect(html).toContain("Cadre propriétaire");
  });
});
