import type { Supplier } from "../../types";

type SupplierDraft = { supplier: Supplier; creating: boolean };
const drafts = new Map<string, SupplierDraft>();

export const readSupplierDraft = (accountId: string) => drafts.get(accountId) ?? null;
export const saveSupplierDraft = (accountId: string, draft: SupplierDraft) => { drafts.set(accountId, draft); };
export const clearSupplierDraft = (accountId: string) => { drafts.delete(accountId); };
