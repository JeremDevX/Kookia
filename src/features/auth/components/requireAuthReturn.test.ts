import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "./RequireAuth";

const location = { pathname: "/setup", search: "", hash: "", state: { from: { pathname: "/orders", search: "?view=week", hash: "#selection" } } };
vi.mock("react-router-dom", () => ({
  useLocation: () => location,
  Navigate: ({ state }: { state: unknown }) => createElement("span", null, JSON.stringify(state)),
  Outlet: () => null,
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ status: "unauthenticated" }) }));

describe("RequireAuth return", () => {
  it("preserves the original destination when setup requires a new login", () => {
    const html = renderToStaticMarkup(createElement(RequireAuth));
    expect(html).toContain("/orders");
    expect(html).toContain("?view=week");
    expect(html).toContain("#selection");
    expect(html).not.toContain("/setup");
  });
  it("preserves ordinary protected locations", () => {
    location.pathname = "/stocks";
    const html = renderToStaticMarkup(createElement(RequireAuth));
    expect(html).toContain("/stocks");
  });
});
