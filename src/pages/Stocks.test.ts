import { Children, isValidElement, type ReactElement } from "react";
import { expect, it, vi } from "vitest";
import Stocks from "./Stocks";
import StockInventoryTable from "../components/stocks/StockInventoryTable";
import Input from "../components/common/Input";

const state = vi.hoisted(() => ({ params: new URLSearchParams(), pagination: null as null | { filters: string; page: number }, hook: 0 }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    if (state.hook++ === 0) return [state.pagination ?? initial, (value: typeof state.pagination) => { state.pagination = value; }];
    return [typeof initial === "function" ? initial() : initial, vi.fn()];
  },
  useRef: () => ({ current: null }),
  useEffect: vi.fn(),
}));
vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(),
  useNavigate: () => vi.fn(), useLocation: () => ({ hash: "" }),
  useSearchParams: () => [state.params, (params: URLSearchParams) => { state.params = params; }],
}));
const products = Array.from({ length: 15 }, (_, i) => ({ id: String(i), name: `Produit ${i + 1}`, category: "Frais", currentStock: 1, minThreshold: 0 }));
vi.mock("../hooks", () => ({ useProductsWithMutations: () => ({ products, getStatus: () => "optimal", loading: false, error: null }) }));
vi.mock("../features/inventory/useInventoryCatalog", () => ({ useInventoryCatalog: () => ({ suppliers: [] }) }));
vi.mock("../context/useCart", () => ({ useCart: () => ({ loading: false }) }));
vi.mock("../context/ToastContext", () => ({ useToast: () => ({ addToast: vi.fn() }) }));

function find(node: unknown, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as never)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const render = () => { state.hook = 0; return Stocks({}); };

it("pagine les produits et revient à la première page quand la recherche change", () => {
  state.params = new URLSearchParams(); state.pagination = null;
  let tree = render();
  const table = () => find(tree, (element) => element.type === StockInventoryTable)!;
  expect((table().props.products as typeof products).map((product) => product.name)).toEqual(products.slice(0, 7).map((product) => product.name));
  const next = find(tree, (element) => element.props.children === "Suivante")!;
  (next.props.onClick as () => void)();
  tree = render();
  expect((table().props.products as typeof products).map((product) => product.name)).toEqual(products.slice(7, 14).map((product) => product.name));
  const search = find(tree, (element) => element.type === Input)!;
  (search.props.onChange as (event: unknown) => void)({ target: { value: "Produit" } });
  tree = render();
  expect((table().props.products as typeof products).map((product) => product.name)).toEqual(products.slice(0, 7).map((product) => product.name));
});
