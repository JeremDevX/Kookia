import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import InventorySessionPanel from "./InventorySessionPanel";

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as Array<ReturnType<typeof vi.fn>>, effects: [] as Array<() => unknown> }));
const api = vi.hoisted(() => ({ getInventory: vi.fn(), openInventory: vi.fn(), validateInventory: vi.fn() }));
vi.mock("../../services/inventorySessionService", () => api);
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => { const index = state.index++; return [state.values[index], state.setters[index]]; },
  useEffect: (effect: () => unknown) => { state.effects.push(effect); },
}));
vi.mock("react-router-dom", () => ({ useBlocker: () => ({ state: "unblocked" }) }));

function find(node: unknown, label: string): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (node.props.children === label) return node;
  for (const child of Children.toArray(node.props.children as never)) {
    const result = find(child, label); if (result) return result;
  }
}
const product = { productId: "p1", name: "Tomates", category: "Légumes", unit: "kg", stockRevision: 1,
  theoreticalQuantity: 10, countedQuantity: 5, reason: "Casse" };
beforeEach(() => {
  state.index = 0; state.effects = [];
  api.getInventory.mockReset(); api.openInventory.mockReset(); api.validateInventory.mockReset();
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  state.values = [{ id: "s1", status: "draft", revision: 2, lines: [product] }, { p1: "5" }, false, "", false, false, false, false,
    false, { p1: { quantity: 6, reason: "Erreur" } }, {}, null, true, 0];
  state.setters = Array.from({ length: state.values.length }, () => vi.fn());
});
it("signale un conflit masqué et propose d’effacer les filtres", () => {
  const clear = vi.fn();
  const tree = InventorySessionPanel({ search: "farine", category: "all", onRefresh: async () => {}, onClearFilters: clear });
  const button = find(tree, "Afficher tous les produits");
  expect(button).toBeDefined();
  (button!.props.onClick as () => void)();
  expect(clear).toHaveBeenCalledOnce();
});
it.each(["Garder ma saisie", "Prendre la valeur enregistrée"])("protège le choix « %s » avant enregistrement", (label) => {
  const tree = InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  const button = find(tree, label);
  expect(button).toBeDefined();
  (button!.props.onClick as () => void)();
  expect(state.setters[7]).toHaveBeenCalledWith(true);
});

it("consulte le brouillon sans en créer à l’ouverture", async () => {
  state.values[0] = null; state.values[12] = false;
  api.getInventory.mockResolvedValue(null);
  InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(api.getInventory).toHaveBeenCalledOnce());
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
});
it("crée le brouillon seulement après le choix de commencer", async () => {
  state.values[0] = null;
  api.openInventory.mockResolvedValue({ id: "s1", revision: 1, status: "draft", lines: [] });
  const tree = InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  const button = find(tree, "Commencer l’inventaire");
  expect(button).toBeDefined();
  expect(api.openInventory).not.toHaveBeenCalled();
  (button!.props.onClick as () => void)();
  await vi.waitFor(() => expect(api.openInventory).toHaveBeenCalledOnce());
});
it("reprend un brouillon existant sans créer de session", async () => {
  const draft = { id: "s1", revision: 1, status: "draft", lines: [product] };
  api.getInventory.mockResolvedValue(draft);
  InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[0]).toHaveBeenCalledWith(draft));
  expect(api.openInventory).not.toHaveBeenCalled();
});
it("demande une action avant de vérifier une validation restée incertaine", async () => {
  const operation = { id: "s1", revision: 2 };
  vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify(operation) });
  api.getInventory.mockResolvedValue(null);
  InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[11]).toHaveBeenCalledWith(operation));
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
});
