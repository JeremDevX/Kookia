import { expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { useInventoryCatalog } from "./useInventoryCatalog";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("react", () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useCallback: (callback: unknown) => callback,
  useEffect: vi.fn(),
}));

it("charge les produits et les fournisseurs en une seule requête", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ products: [], suppliers: [] });
  const { refetch } = useInventoryCatalog();

  await refetch();

  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith("/workspace/catalog");
});
