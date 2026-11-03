import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as Array<() => void | (() => void)> }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [state.values[index], (value: unknown) => { state.values[index] = typeof value === "function" ? (value as (v: unknown) => unknown)(state.values[index]) : value; }];
  }, useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock("../../services/orderService", () => ({ getPurchaseReconciliation: vi.fn(), recordPurchaseCredit: vi.fn() }));
vi.mock("../../services/inventorySessionService", () => ({ getInventoryWorkspace: vi.fn().mockResolvedValue({ restaurantId: "restaurant" }) }));
import { AccountPurchaseReconciliation } from "./PurchaseReconciliation";
import { getPurchaseReconciliation, recordPurchaseCredit } from "../../services/orderService";
import { submitPendingCredit } from "../../features/orders/pendingCredit";
import { getInventoryWorkspace } from "../../services/inventorySessionService";

type Element = { props?: Record<string, unknown> & { children?: unknown } };
function find(node: unknown, predicate: (element: Element) => boolean): Element | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  const element = node as Element;
  return predicate(element) ? element : find(element.props?.children, predicate);
}
const receipt = "00000000-0000-4000-8000-000000000002";
const render = () => { state.index = 0; return AccountPurchaseReconciliation({ orderId: "order", disabled: false, userId: "user" }); };
const field = (tree: unknown, id: string) => find(tree, (element) => element.props?.id === id)!.props!;
const change = (props: Record<string, unknown>, value: string) => (props.onChange as (event: unknown) => void)({ target: { value } });

beforeEach(() => {
  state.effects = [];
  state.values = [{ receipts: [{ receiptId: receipt, simulated: false, credits: [] }], assumptions: [] }, "restaurant"];
  vi.resetAllMocks();
  vi.mocked(getInventoryWorkspace).mockResolvedValue({ restaurantId: "restaurant" });
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.stubGlobal("navigator", { locks: { request: (_key: string, callback: () => Promise<void>) => callback() } });
});

it("affiche l’avoir incertain et le vérifie avec les mêmes données", async () => {
  let tree = render();
  change(field(tree, "credit-receipt-order"), receipt); tree = render();
  change(field(tree, "credit-ref-order"), "AV-1"); tree = render();
  change(field(tree, "credit-amount-order"), "10"); tree = render();
  change(field(tree, "credit-reason-order"), "Retour"); tree = render();
  vi.mocked(recordPurchaseCredit).mockRejectedValueOnce(new Error("connexion perdue")).mockResolvedValueOnce({ id: "id", replayed: true });
  (find(tree, (element) => typeof element.props?.onSubmit === "function")!.props!.onSubmit as (event: unknown) => void)({ preventDefault() {} });
  await vi.waitFor(() => expect(JSON.stringify(render())).toContain("Enregistrement incertain")); tree = render();
  expect(find(tree, (element) => element.props?.id === "credit-ref-order")).toBeUndefined();
  (find(tree, (element) => element.props?.children === "Vérifier l’enregistrement")!.props!.onClick as () => void)();
  await vi.waitFor(() => expect(JSON.stringify(render())).toContain("Avoir rapproché"));
  expect(vi.mocked(recordPurchaseCredit).mock.calls[1]).toEqual(vi.mocked(recordPurchaseCredit).mock.calls[0]);
});

it("retrouve l’avoir et le rejoue après remontage du composant", async () => {
  const input = { operationId: "00000000-0000-4000-8000-000000000001", receiptId: receipt, reference: "AV-2", amount: 7.5, reason: "Retour" };
  await expect(submitPendingCredit("user", "restaurant", "order", input, false, () => {}, () => Promise.reject(new Error("perdu")))).rejects.toThrow();
  state.values = []; state.effects = [];
  vi.mocked(getPurchaseReconciliation).mockResolvedValue({ orderId: "order", receipts: [], assumptions: [] });
  vi.mocked(recordPurchaseCredit).mockResolvedValue({ id: "credit", replayed: true });
  render(); state.effects[0]();
  await vi.waitFor(() => expect(JSON.stringify(render())).toContain("AV-2"));
  const tree = render();
  (find(tree, (element) => element.props?.children === "Vérifier l’enregistrement")!.props!.onClick as () => void)();
  await vi.waitFor(() => expect(recordPurchaseCredit).toHaveBeenCalledWith(input, "restaurant"));
});
