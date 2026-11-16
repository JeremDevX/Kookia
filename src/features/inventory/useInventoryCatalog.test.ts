import { beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { useInventoryCatalog } from "./useInventoryCatalog";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("react", () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useCallback: (callback: unknown) => callback,
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
