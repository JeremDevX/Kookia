import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SupplierSettings from "./SupplierSettings";

const state = vi.hoisted(() => ({ calls: 0, editing: false }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [state.calls++ === 1 && state.editing ? { id: "1", name: "En cours", email: "test@example.test", phone: "" } : initial, vi.fn()]),
  useRef: vi.fn((value: unknown) => ({ current: value })),
  useEffect: vi.fn(),
}));
vi.mock("../../features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "account" } }) }));
vi.mock("../../features/inventory/useInventoryCatalog", () => ({ useInventoryCatalog: () => ({ suppliers: [{ id: "2", name: "Autre", email: "autre@example.test", phone: "" }], loading: false, error: null, refetch: vi.fn() }) }));

describe("édition fournisseur", () => {
  it("bloque les autres formulaires pendant une saisie", () => {
    state.calls = 0; state.editing = true;
    const html = renderToStaticMarkup(createElement(SupplierSettings));
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Modifier<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Ajouter un fournisseur<\/button>/);
    expect(html).toContain("En cours");
  });
});
