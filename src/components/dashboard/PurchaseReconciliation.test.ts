import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [state.values[index], (value: unknown) => { state.values[index] = typeof value === "function" ? (value as (v: unknown) => unknown)(state.values[index]) : value; }];
  }, useEffect: () => undefined,
}));
vi.mock("../../services/orderService", () => ({ getPurchaseReconciliation: vi.fn(), recordPurchaseCredit: vi.fn() }));
import PurchaseReconciliation from "./PurchaseReconciliation";
import { recordPurchaseCredit } from "../../services/orderService";

type Element = { props?: Record<string, unknown> & { children?: unknown } };
function find(node: unknown, predicate: (element: Element) => boolean): Element | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return undefined;
  const element = node as Element;
  return predicate(element) ? element : find(element.props?.children, predicate);
}
const render = () => { state.index = 0; return PurchaseReconciliation({ orderId: "order", disabled: false }); };
const field = (tree: unknown, id: string) => find(tree, (element) => element.props?.id === id)!.props!;
const change = (props: Record<string, unknown>, value: string) => (props.onChange as (event: unknown) => void)({ target: { value } });

beforeEach(() => { state.values = [{ receipts: [{ receiptId: "receipt", simulated: false, credits: [] }], assumptions: [] }]; vi.resetAllMocks(); });

it("retries an uncertain credit with the same operation and locks its fields", async () => {
  let tree = render();
  change(field(tree, "credit-receipt-order"), "receipt"); tree = render();
  change(field(tree, "credit-ref-order"), "AV-1"); tree = render();
  change(field(tree, "credit-amount-order"), "10"); tree = render();
  change(field(tree, "credit-reason-order"), "Retour"); tree = render();
  vi.mocked(recordPurchaseCredit).mockRejectedValueOnce(new Error("connexion perdue")).mockResolvedValueOnce({ id: "id", replayed: true });
  const submit = () => (find(tree, (element) => typeof element.props?.onSubmit === "function")!.props!.onSubmit as (event: unknown) => void)({ preventDefault() {} });
  submit(); await vi.waitFor(() => expect(recordPurchaseCredit).toHaveBeenCalledTimes(1)); await Promise.resolve(); tree = render();
  expect(field(tree, "credit-ref-order").disabled).toBe(true);
  expect(JSON.stringify(tree)).toContain("Enregistrement incertain");
  submit(); await vi.waitFor(() => expect(recordPurchaseCredit).toHaveBeenCalledTimes(2)); await Promise.resolve();
  expect(vi.mocked(recordPurchaseCredit).mock.calls[1][0]).toEqual(vi.mocked(recordPurchaseCredit).mock.calls[0][0]);
  expect(JSON.stringify(render())).toContain("Avoir rapproché");
});
