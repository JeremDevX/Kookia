import { Children, isValidElement, type ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountInventorySessionPanel } from "./InventorySessionPanel";

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as Array<ReturnType<typeof vi.fn>>, effects: [] as Array<() => unknown>, userId: "user-1" }));
const api = vi.hoisted(() => ({ getInventory: vi.fn(), getInventoryWorkspace: vi.fn(), saveInventory: vi.fn(), openInventory: vi.fn(), validateInventory: vi.fn() }));
vi.mock("../../services/inventorySessionService", () => api);
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => { const index = state.index++; return [state.values[index], state.setters[index]]; },
  useEffect: (effect: () => unknown) => { state.effects.push(effect); },
}));
vi.mock("../../features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
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
  state.index = 0; state.effects = []; state.userId = "user-1";
  api.getInventory.mockReset(); api.getInventoryWorkspace.mockResolvedValue({ restaurantId: "restaurant-1" }); api.openInventory.mockReset(); api.validateInventory.mockReset();
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  state.values = ["restaurant-1", { id: "s1", status: "draft", revision: 2, lines: [product] }, { p1: "5" }, false, "", false, false, false, false,
    false, { p1: { quantity: 6, reason: "Erreur" } }, {}, null, true, 0, false];
  state.setters = Array.from({ length: state.values.length }, () => vi.fn());
});
it("signale un conflit masqué et propose d’effacer les filtres", () => {
  const clear = vi.fn();
  const tree = AccountInventorySessionPanel({ userId: state.userId, search: "farine", category: "all", onRefresh: async () => {}, onClearFilters: clear });
  const button = find(tree, "Afficher tous les produits");
  expect(button).toBeDefined();
  (button!.props.onClick as () => void)();
  expect(clear).toHaveBeenCalledOnce();
});
it.each(["Garder ma saisie", "Prendre la valeur enregistrée"])("protège le choix « %s » avant enregistrement", (label) => {
  const tree = AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  const button = find(tree, label);
  expect(button).toBeDefined();
  (button!.props.onClick as () => void)();
  expect(state.setters[8]).toHaveBeenCalledWith(true);
});

it("consulte le brouillon sans en créer à l’ouverture", async () => {
  state.values[1] = null; state.values[13] = false;
  api.getInventory.mockResolvedValue(null);
  AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(api.getInventory).toHaveBeenCalledOnce());
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
});
it("crée le brouillon seulement après le choix de commencer", async () => {
  state.values[1] = null;
  api.openInventory.mockResolvedValue({ id: "s1", revision: 1, status: "draft", lines: [] });
  const tree = AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  const button = find(tree, "Commencer l’inventaire");
  expect(button).toBeDefined();
  expect(api.openInventory).not.toHaveBeenCalled();
  (button!.props.onClick as () => void)();
  await vi.waitFor(() => expect(api.openInventory).toHaveBeenCalledOnce());
});
it("reprend un brouillon existant sans créer de session", async () => {
  const draft = { id: "s1", revision: 1, status: "draft", lines: [product] };
  api.getInventory.mockResolvedValue(draft);
  AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[1]).toHaveBeenCalledWith(draft));
  expect(api.openInventory).not.toHaveBeenCalled();
});
it("demande une action avant de vérifier une validation restée incertaine", async () => {
  const operation = { id: "s1", revision: 2 };
  vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify(operation) });
  api.getInventory.mockResolvedValue(null);
  AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[12]).toHaveBeenCalledWith(operation));
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
});

it.each([401, 403, 404, 429, 500])("conserve la validation incertaine après une erreur %s", async (status) => {
  const { ApiError } = await import("../../config/api");
  const removeItem = vi.fn();
  vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem });
  state.values[12] = { id: "s1", revision: 2 };
  api.validateInventory.mockRejectedValue(new ApiError(status, { code: "ERROR", message: "Erreur" }));
  const tree = AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  (find(tree, "Vérifier la validation")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(state.setters[4]).toHaveBeenCalledWith("Erreur"));
  expect(removeItem).not.toHaveBeenCalled();
  expect(state.setters[12]).not.toHaveBeenCalledWith(null);
});
it("recherche la validation uniquement pour le compte et l’établissement courants", async () => {
  const getItem = vi.fn(() => null);
  vi.stubGlobal("sessionStorage", { getItem });
  api.getInventory.mockResolvedValue(null);
  AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(getItem).toHaveBeenCalledWith("inventory-pending-validation:user-1:restaurant-1"));
});

it.each([{ user: "user-2", restaurant: "restaurant-1" }, { user: "user-1", restaurant: "restaurant-2" }])("ne reprend pas la validation d’un autre compte ou établissement", async ({ user, restaurant }) => {
  state.userId = user;
  api.getInventoryWorkspace.mockResolvedValue({ restaurantId: restaurant });
  api.getInventory.mockResolvedValue(null);
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => key === "inventory-pending-validation:user-1:restaurant-1" ? JSON.stringify({ id: "s1", revision: 2 }) : null });
  AccountInventorySessionPanel({ userId: state.userId, search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[13]).toHaveBeenCalledWith(true));
  expect(state.setters[12]).not.toHaveBeenCalledWith({ id: "s1", revision: 2 });
  expect(api.validateInventory).not.toHaveBeenCalled();
});

it("signale une ancienne validation sans la rejouer", async () => {
  api.getInventory.mockResolvedValue(null);
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => key === "inventory-pending-validation" ? "ancienne" : null });
  AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[15]).toHaveBeenCalledWith(true));
  expect(api.validateInventory).not.toHaveBeenCalled();
});
it("propose la comparaison lorsque la validation incertaine rencontre un brouillon modifié", async () => {
  const { ApiError } = await import("../../config/api");
  state.values[12] = { id: "s1", revision: 2 };
  vi.stubGlobal("sessionStorage", { removeItem: vi.fn() });
  api.validateInventory.mockRejectedValue(new ApiError(409, { code: "INVENTORY_CHANGED", message: "Modifié" }));
  const tree = AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  (find(tree, "Vérifier la validation")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(state.setters[9]).toHaveBeenCalledWith(true));
});

it.each(["{", "null", "{}", '{"id":"s1","revision":0}'])("bloque la reprise si les données locales sont invalides : %s", async (stored) => {
  api.getInventory.mockResolvedValue({ id: "s1", revision: 2, status: "draft", lines: [product] });
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => key.includes(":") ? stored : null });
  AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(state.setters[4]).toHaveBeenCalledWith(expect.stringContaining("ne peut pas être vérifiée")));
  expect(state.setters[1]).not.toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  expect(api.validateInventory).not.toHaveBeenCalled();
});
it("associe le chargement du brouillon à l’établissement retourné", async () => {
  api.getInventory.mockResolvedValue(null);
  AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  state.effects[2]();
  await vi.waitFor(() => expect(api.getInventory).toHaveBeenCalledWith("restaurant-1"));
});
it("conserve la validation si l’établissement a changé", async () => {
  const { ApiError } = await import("../../config/api");
  const removeItem = vi.fn();
  vi.stubGlobal("sessionStorage", { removeItem });
  state.values[12] = { id: "s1", revision: 2 };
  api.validateInventory.mockRejectedValue(new ApiError(409, { code: "WORKSPACE_CHANGED", message: "Établissement changé" }));
  const tree = AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  (find(tree, "Vérifier la validation")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(state.setters[4]).toHaveBeenCalledWith("Établissement changé"));
  expect(api.validateInventory).toHaveBeenCalledWith({ id: "s1", revision: 2 }, "restaurant-1");
  expect(removeItem).not.toHaveBeenCalled();
});

it.each([[409, "SETUP_REQUIRED"], [409, "UNKNOWN"], [400, "UNKNOWN"]])("conserve la validation sur l’erreur %s %s", async (status, code) => {
  const { ApiError } = await import("../../config/api");
  const removeItem = vi.fn();
  vi.stubGlobal("sessionStorage", { removeItem });
  state.values[12] = { id: "s1", revision: 2 };
  api.validateInventory.mockRejectedValue(new ApiError(status as number, { code: code as string, message: "Réessayez" }));
  const tree = AccountInventorySessionPanel({ userId: "user-1", search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn() });
  (find(tree, "Vérifier la validation")!.props.onClick as () => void)();
  await vi.waitFor(() => expect(state.setters[4]).toHaveBeenCalledWith("Réessayez"));
  expect(removeItem).not.toHaveBeenCalled();
  expect(state.setters[12]).not.toHaveBeenCalledWith(null);
});
