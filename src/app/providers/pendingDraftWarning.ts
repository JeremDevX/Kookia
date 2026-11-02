import { hasSetupDraft, readSetupDraft } from "../../features/setup/setupDraft";
import { readSupplierDraft } from "../../components/settings/supplierDraft";

export const warnForDraft = (accountId: string, event: BeforeUnloadEvent) => {
  if (!hasSetupDraft(readSetupDraft(accountId)) && !readSupplierDraft(accountId)) return;
  event.preventDefault();
  event.returnValue = "";
};
