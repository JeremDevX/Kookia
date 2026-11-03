export const emptySetupForm = { name: "", type: "", address: "", city: "", email: "", phone: "", dailyCovers: "", hasTerrace: "", openingWeekdays: null as number[] | null };
export type SetupForm = typeof emptySetupForm;

export const hasSetupDraft = (form: SetupForm): boolean => Object.values(form).some((value) => value !== "" && value !== null);

const drafts = new Map<string, SetupForm>();
export const readSetupDraft = (accountId: string): SetupForm => ({ ...(drafts.get(accountId) ?? emptySetupForm) });
export const saveSetupDraft = (accountId: string, form: SetupForm) => {
  if (!hasSetupDraft(form)) { clearSetupDraft(accountId); return; }
  drafts.set(accountId, { ...form });
};
export const clearSetupDraft = (accountId: string) => { drafts.delete(accountId); };
