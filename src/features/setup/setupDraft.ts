export const emptySetupForm = { name: "", type: "", address: "", city: "", email: "", phone: "", dailyCovers: "", hasTerrace: "" };
export type SetupForm = typeof emptySetupForm;

const drafts = new Map<string, SetupForm>();
export const readSetupDraft = (accountId: string): SetupForm => ({ ...(drafts.get(accountId) ?? emptySetupForm) });
export const saveSetupDraft = (accountId: string, form: SetupForm) => { drafts.set(accountId, { ...form }); };
export const clearSetupDraft = (accountId: string) => { drafts.delete(accountId); };
