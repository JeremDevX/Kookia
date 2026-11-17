import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { createStockCount, getCatalog, getProducts, getSuppliers } from "../../services/productService";
import { useInventoryCatalog } from "./useInventoryCatalog";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("react", () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("charge les produits et les fournisseurs en une seule requête", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ products: [], suppliers: [] });
  const { refetch } = useInventoryCatalog();

  await expect(refetch()).resolves.toBe(true);

  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith("/workspace/catalog");
});

it("signale un échec de rechargement au comptage de stock", async () => {
  vi.mocked(apiRequest).mockRejectedValue(new Error("Catalogue indisponible"));
  const { refetch } = useInventoryCatalog();

  await expect(refetch()).resolves.toBe(false);
});

it("partage les lectures simultanées et réessaie après une erreur", async () => {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error("Catalogue indisponible"));
  const pending = getCatalog();
  const relatedReads = [getProducts(), getSuppliers()];
  expect(apiRequest).toHaveBeenCalledTimes(1);
  const results = await Promise.allSettled([pending, ...relatedReads]);
  expect(results.map((result) => result.status)).toEqual(["rejected", "rejected", "rejected"]);
  vi.mocked(apiRequest).mockResolvedValue({ products: [], suppliers: [] });
  await expect(getCatalog()).resolves.toEqual({ products: [], suppliers: [] });
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

it("rafraîchit le catalogue après modification même si une autre lecture est en cours", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  vi.mocked(apiRequest)
    .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ products: [{ id: "new" }], suppliers: [] });
  const previous = getCatalog();
  const refreshed = getCatalog({ fresh: true });
  expect(getCatalog()).toBe(refreshed);
  resolveOld({ products: [], suppliers: [] });
  await expect(previous).resolves.toEqual({ products: [{ id: "new" }], suppliers: [] });
  await expect(refreshed).resolves.toEqual({ products: [{ id: "new" }], suppliers: [] });
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

it("écarte une réponse préparée avant un comptage enregistré", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  const updated = { products: [{ id: "item", currentStock: 3 }], suppliers: [] };
  vi.mocked(apiRequest)
    .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ product: updated.products[0] })
    .mockResolvedValueOnce(updated);
  const previous = getCatalog();
  await createStockCount("item", { operationId: "operation", expectedStockRevision: 1, expectedUnit: "kg", countedQuantity: 3 });
  resolveOld({ products: [{ id: "item", currentStock: 5 }], suppliers: [] });
  await expect(previous).resolves.toEqual(updated);
});
