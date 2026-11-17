import { Children, isValidElement, type ComponentProps, type ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "../../config/api";
import InventoryCountTable from "./InventoryCountTable";
import InventorySessionPanel from "./InventorySessionPanel";

const hooks = vi.hoisted(() => ({ index: 0, values: [] as unknown[], effects: [] as Array<() => unknown>, userId: "user-1" }));
const api = vi.hoisted(() => ({ getInventory: vi.fn(), getInventoryWorkspace: vi.fn(), saveInventory: vi.fn(),
  openInventory: vi.fn(), validateInventory: vi.fn(), refreshInventory: vi.fn(), discardInventory: vi.fn() }));
vi.mock("../../services/inventorySessionService", () => api);
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (index >= hooks.values.length) hooks.values[index] = initial;
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === "function" ? next(hooks.values[index]) : next;
    }];
  },
  useRef: () => ({ current: null }),
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
}));
vi.mock("../../features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: { id: hooks.userId } }) }));
vi.mock("react-router-dom", () => ({ useBlocker: () => ({ state: "unblocked" }) }));

type Node = ReactElement<Record<string, unknown>>;
const key = "inventory-pending-validation:user-1:restaurant-1";
const testOperation = { id: "s1", revision: 2 };
const product = { productId: "p1", name: "Tomates", category: "Légumes", unit: "kg", stockRevision: 1,
  theoreticalQuantity: 10, countedQuantity: 5, reason: "Casse" };
const draft = { ...testOperation, status: "draft", lines: [product] };
const slots = new Map<string, string>();

function find(node: unknown, predicate: (element: Node) => boolean): Node | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  if (node.type === InventoryCountTable) return find(InventoryCountTable(node.props as ComponentProps<typeof InventoryCountTable>), predicate);
  for (const child of Children.toArray(node.props.children as never)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

const render = (props: Partial<ComponentProps<typeof InventorySessionPanel>> = {}) => {
  hooks.index = 0; hooks.effects = [];
  const panel = InventorySessionPanel({ search: "", category: "all", onRefresh: async () => {}, onClearFilters: vi.fn(), ...props });
  if (!isValidElement(panel)) throw new Error("Inventaire indisponible");
  const accountPanel = panel.type as (props: unknown) => Node;
  return accountPanel(panel.props);
};
const byLabel = (label: string, props?: Partial<ComponentProps<typeof InventorySessionPanel>>) => find(render(props),
  (node) => node.props.children === label || node.props["aria-label"] === label);
const click = (label: string, props?: Partial<ComponentProps<typeof InventorySessionPanel>>) => {
  const button = byLabel(label, props);
  expect(button).toBeDefined();
  (button!.props.onClick as (event: { currentTarget: object }) => void)({ currentTarget: {} });
};
const load = async () => {
  render();
  hooks.effects[0]();
  await Promise.resolve();
  await Promise.resolve();
};
const storedValidation = () => slots.set(key, JSON.stringify(testOperation));

beforeEach(() => {
  vi.resetAllMocks();
  hooks.values = []; hooks.userId = "user-1";
  api.getInventoryWorkspace.mockResolvedValue({ restaurantId: "restaurant-1" });
  api.getInventory.mockResolvedValue(null);
  slots.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: vi.fn((name: string) => slots.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => slots.set(name, value)),
    removeItem: vi.fn((name: string) => slots.delete(name)),
  });
  vi.stubGlobal("document", { activeElement: null });
});

it("consulte le brouillon de l’établissement sans en créer à l’ouverture", async () => {
  await load();
  expect(api.getInventory).toHaveBeenCalledWith("restaurant-1");
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
  expect(byLabel("Commencer l’inventaire")).toBeDefined();
});

it("crée un brouillon sur demande et permet de réessayer si son ouverture échoue", async () => {
  api.openInventory.mockRejectedValueOnce(new Error("Connexion interrompue")).mockResolvedValue(draft);
  await load();
  click("Commencer l’inventaire");
  await vi.waitFor(() => expect(byLabel("Connexion interrompue")).toBeDefined());
  click("Commencer l’inventaire");
  await vi.waitFor(() => expect(byLabel("Quantité comptée : Tomates")?.props.value).toBe("5"));
  expect(api.openInventory).toHaveBeenCalledTimes(2);
});

it("reprend un brouillon existant sans créer de session", async () => {
  api.getInventory.mockResolvedValue(draft);
  await load();
  expect(byLabel("Quantité comptée : Tomates")?.props.value).toBe("5");
  expect(api.openInventory).not.toHaveBeenCalled();
});

it("rejoue la validation persistée uniquement à la demande, même si la lecture du brouillon est indisponible", async () => {
  storedValidation();
  api.getInventory.mockRejectedValue(new Error("Lecture impossible"));
  api.validateInventory.mockResolvedValue({ ...draft, status: "validated" });
  await load();
  expect(api.openInventory).not.toHaveBeenCalled();
  expect(api.validateInventory).not.toHaveBeenCalled();
  click("Vérifier la validation");
  await vi.waitFor(() => expect(byLabel("Inventaire validé. Les produits non comptés restent à vérifier.")).toBeDefined());
  expect(api.validateInventory).toHaveBeenCalledWith(testOperation, "restaurant-1");
  expect(sessionStorage.removeItem).toHaveBeenCalledWith(key);
});

it.each([[401, "ERROR"], [403, "ERROR"], [404, "ERROR"], [429, "ERROR"], [500, "ERROR"],
  [409, "WORKSPACE_CHANGED"], [409, "SETUP_REQUIRED"], [409, "UNKNOWN"], [400, "UNKNOWN"]])(
  "conserve la validation incertaine après l’erreur %s %s", async (status, code) => {
    storedValidation();
    api.validateInventory.mockRejectedValue(new ApiError(status, { code, message: "Erreur" }));
    await load();
    click("Vérifier la validation");
    await vi.waitFor(() => expect(byLabel("Erreur")).toBeDefined());
    expect(byLabel("Vérifier la validation")?.props.disabled).toBe(false);
    expect(slots.get(key)).toBe(JSON.stringify(testOperation));
  },
);

it.each([{ user: "user-2", restaurant: "restaurant-1" }, { user: "user-1", restaurant: "restaurant-2" }])(
  "ne reprend pas la validation d’un autre compte ou établissement", async ({ user, restaurant }) => {
    hooks.userId = user;
    api.getInventoryWorkspace.mockResolvedValue({ restaurantId: restaurant });
    storedValidation();
    await load();
    expect(sessionStorage.getItem).toHaveBeenCalledWith(`inventory-pending-validation:${user}:${restaurant}`);
    expect(byLabel("Vérifier la validation")).toBeUndefined();
    expect(byLabel("Commencer l’inventaire")).toBeDefined();
    expect(api.validateInventory).not.toHaveBeenCalled();
  },
);

it("signale une ancienne validation sans la rejouer", async () => {
  slots.set("inventory-pending-validation", "ancienne");
  await load();
  expect(byLabel("Une ancienne validation reste à vérifier, mais son compte et son établissement ne sont pas identifiés. Vérifiez l’historique des comptages avant de refaire l’inventaire.")).toBeDefined();
  expect(api.validateInventory).not.toHaveBeenCalled();
  expect(slots.has("inventory-pending-validation")).toBe(true);
});

it.each(["{", "null", "{}", '{"id":"s1","revision":0}'])(
  "bloque la reprise si les données locales sont invalides (%s)", async (stored) => {
    slots.set(key, stored);
    api.getInventory.mockResolvedValue(draft);
    await load();
    expect(byLabel("Réessayer")).toBeDefined();
    expect(byLabel("Quantité comptée : Tomates")).toBeUndefined();
    expect(api.validateInventory).not.toHaveBeenCalled();
    expect(slots.get(key)).toBe(stored);
  },
);

it("propose la comparaison si le brouillon d’une validation incertaine a changé", async () => {
  storedValidation();
  api.getInventory.mockResolvedValue(draft);
  api.validateInventory.mockRejectedValue(new ApiError(409, { code: "INVENTORY_CHANGED", message: "Modifié" }));
  await load();
  click("Vérifier la validation");
  await vi.waitFor(() => expect(byLabel("Comparer les saisies")).toBeDefined());
  expect(slots.has(key)).toBe(false);
});

it("conserve une saisie après échec, révèle le conflit masqué et conserve la valeur choisie jusqu’à l’enregistrement", async () => {
  const latest = { ...draft, revision: 3, lines: [{ ...product, countedQuantity: 6, reason: "Erreur" }] };
  api.getInventory.mockResolvedValueOnce(draft).mockResolvedValueOnce(latest);
  api.saveInventory.mockRejectedValueOnce(new ApiError(409, { code: "INVENTORY_CHANGED", message: "Modifié" }))
    .mockResolvedValueOnce({ ...latest, revision: 4 });
  await load();
  const quantity = byLabel("Quantité comptée : Tomates")!;
  (quantity.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "7" } });
  click("Enregistrer le brouillon");
  await vi.waitFor(() => expect(byLabel("Comparer les saisies")).toBeDefined());
  expect(byLabel("Quantité comptée : Tomates")?.props.value).toBe("7");
  click("Comparer les saisies");
  await vi.waitFor(() => expect(byLabel("Prendre la valeur enregistrée")).toBeDefined());
  const clear = vi.fn();
  click("Afficher tous les produits", { search: "farine", onClearFilters: clear });
  expect(clear).toHaveBeenCalledOnce();
  click("Prendre la valeur enregistrée");
  expect(byLabel("Quantité comptée : Tomates")?.props.value).toBe("6");
  click("Enregistrer le brouillon");
  expect(api.saveInventory).toHaveBeenLastCalledWith(latest, "restaurant-1");
});
