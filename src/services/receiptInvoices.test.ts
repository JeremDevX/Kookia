import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../config/api";
import { getReceiptInvoices } from "./invoiceService";
vi.mock("../config/api", async (original) => ({ ...await original<typeof import("../config/api")>(), apiRequest: vi.fn() }));
describe("factures d’une commande", () => {
  it("charge uniquement les brouillons de cette commande", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([]);
    await getReceiptInvoices("commande 1");
    expect(apiRequest).toHaveBeenCalledWith("/workspace/orders/commande%201/receipt-invoices");
  });
});
