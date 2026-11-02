import { describe, expect, it } from "vitest";
import { canAccessWorkspace } from "./workspacePermissions.js";

const root = "/api/workspace";
const allowed = (role: unknown, method: string, path: string) => canAccessWorkspace(role, method, root + path);

describe("workspace permissions", () => {
  it.each(["owner", "chef", "kitchen"])("allows %s the stock and receipt workflow", (role) => {
    for (const [method, path] of [
      ["GET", "/catalog"], ["GET", "/stock-lots"], ["GET", "/products/p1/lots"],
      ["GET", "/products/p1/counts"], ["GET", "/products/p1/movements"], ["POST", "/products/p1/counts"],
      ["GET", "/orders"], ["POST", "/orders/abc/receipts"], ["GET", "/orders/abc/receipt-invoices"],
    ]) expect(allowed(role, method, path), `${method} ${path}`).toBe(true);
  });
  it("limits order creation to chef and owner", () => {
    for (const [method, path] of [["GET", "/orders/suggestions"], ["GET", "/cart"], ["POST", "/cart"],
      ["POST", "/orders/suggestions/p1/decision"], ["POST", "/orders"]]) {
      expect(allowed("owner", method, path)).toBe(true);
      expect(allowed("chef", method, path)).toBe(true);
      expect(allowed("kitchen", method, path)).toBe(false);
    }
  });
  it("reserves other existing workspace actions to the owner", () => {
    for (const [method, path] of [["PATCH", "/restaurant"], ["POST", "/suppliers"],
      ["POST", "/products/p1/stock"], ["POST", "/sales/abc/refund"], ["POST", "/orders/credits"],
      ["PATCH", "/orders/lines/abc/delivery"], ["GET", "/report"], ["GET", "/invoices"], ["POST", "/invoices/abc"], ["POST", "/invoice-extractions"], ["GET", "/source-invoices"], ["GET", "/orders/abc/reconciliation"]]) {
      expect(allowed("owner", method, path)).toBe(true);
      expect(allowed("chef", method, path)).toBe(false);
      expect(allowed("kitchen", method, path)).toBe(false);
    }
  });
  it("rejects unknown roles, methods, paths and malformed route segments", () => {
    for (const role of ["chef", "kitchen", "admin", null]) {
      for (const [method, path] of [["POST", "/catalog"], ["GET", "/catalog/extra"],
        ["POST", "/products/a/b/counts"], ["POST", "/products/%2F/counts"],
        ["POST", "/products/../counts"], ["POST", "/products/a/counts?x=1"],
        ["post", "/orders"], ["GET", "/orders//"], ["GET", "/unknown"]]) {
        expect(allowed(role, method, path), `${String(role)} ${method} ${path}`).toBe(false);
      }
    }
    expect(allowed("owner", "POST", "/future-route")).toBe(true);
    expect(canAccessWorkspace("owner", "GET", "/api/workspaceevil/catalog")).toBe(false);
    expect(allowed("admin", "GET", "/catalog")).toBe(false);
  });
});
