import { describe, expect, it } from "vitest";
import { clearSupplierDraft, readSupplierDraft, saveSupplierDraft } from "./supplierDraft";

describe("brouillon fournisseur en mémoire", () => {
  it("retrouve la saisie pour le même compte et l’efface après enregistrement ou annulation", () => {
    const draft = { supplier: { id: "supplier", name: "Test", email: "test@example.test", phone: "" }, creating: true };
    saveSupplierDraft("account-a", draft);
    expect(readSupplierDraft("account-a")).toEqual(draft);
    expect(readSupplierDraft("account-b")).toBeNull();
    clearSupplierDraft("account-a");
    expect(readSupplierDraft("account-a")).toBeNull();
  });
});
