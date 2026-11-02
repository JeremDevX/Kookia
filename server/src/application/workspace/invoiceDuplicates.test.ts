import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { checkInvoiceDuplicates } from "./invoiceDuplicates.js";

function transaction(count: number) {
  return {
    workspaceDocument: { findMany: async () => Array.from({ length: count }, (_, index) => ({ revision: 1, data: {
      id: `invoice-${index}`, reference: "F-1", date: "2026-09-01", supplierId: "supplier",
      lines: [], status: "received", source: "manual",
    } })) },
    purchaseReceipt: { findMany: async () => [] },
  } as unknown as Prisma.TransactionClient;
}

describe("invoice duplicate confirmation limit", () => {
  it("accepts the maximum number of identified confirmations", async () => {
    const confirmed = Array.from({ length: 100 }, (_, index) => ({ id: `invoice-${index}`, version: "1:0" }));
    await expect(checkInvoiceDuplicates(transaction(100), "restaurant", "new", "supplier", "F-1", confirmed)).resolves.toBeUndefined();
  });
  it("explains when the confirmation limit is exceeded", async () => {
    await expect(checkInvoiceDuplicates(transaction(101), "restaurant", "new", "supplier", "F-1"))
      .rejects.toMatchObject({ status: 409, code: "TOO_MANY_DUPLICATE_INVOICES", message: expect.stringContaining("Plus de 100") });
  });
});
