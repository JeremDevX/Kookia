import { describe, expect, it } from "vitest";
import { warnForDraft } from "./pendingDraftWarning";
import { clearSetupDraft, emptySetupForm, saveSetupDraft } from "../../features/setup/setupDraft";
import { clearSupplierDraft, saveSupplierDraft } from "../../components/settings/supplierDraft";

const warned = (accountId: string) => {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  warnForDraft(accountId, event);
  return event.defaultPrevented;
};

describe("avertissement de brouillon", () => {
  it("ne dépend que du compte actif et cesse après suppression des brouillons", () => {
    saveSetupDraft("account-a", { ...emptySetupForm, name: "Restaurant" });
    saveSupplierDraft("account-a", { supplier: { id: "supplier", name: "Test", email: "test@example.test", phone: "" }, creating: true });
    expect(warned("account-a")).toBe(true);
    expect(warned("account-b")).toBe(false);
    clearSetupDraft("account-a");
    expect(warned("account-a")).toBe(true);
    clearSupplierDraft("account-a");
    expect(warned("account-a")).toBe(false);
  });
});
