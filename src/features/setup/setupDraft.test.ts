import { describe, expect, it } from "vitest";
import { clearSetupDraft, emptySetupForm, hasSetupDraft, readSetupDraft, saveSetupDraft } from "./setupDraft";

describe("saisie de configuration en mémoire", () => {
  it("repère une saisie non enregistrée, y compris une réponse de terrasse", () => {
    expect(hasSetupDraft(emptySetupForm)).toBe(false);
    expect(hasSetupDraft({ ...emptySetupForm, openingWeekdays: [] })).toBe(true);
    expect(hasSetupDraft({ ...emptySetupForm, name: "Restaurant" })).toBe(true);
    expect(hasSetupDraft({ ...emptySetupForm, hasTerrace: "no" })).toBe(true);
    expect(hasSetupDraft({ ...emptySetupForm, dailyCovers: "0" })).toBe(true);
  });
  it("retrouve la saisie après reconnexion uniquement pour le même compte", () => {
    const form = { ...emptySetupForm, name: "Restaurant", email: "contact@example.test", dailyCovers: "35" };
    saveSetupDraft("account-a", form);
    expect(readSetupDraft("account-a")).toEqual(form);
    expect(readSetupDraft("account-b")).toEqual(emptySetupForm);
    clearSetupDraft("account-a");
    expect(readSetupDraft("account-a")).toEqual(emptySetupForm);
  });
  it("isole les copies pour éviter les modifications accidentelles", () => {
    const form = { ...emptySetupForm, name: "Restaurant" };
    saveSetupDraft("account-c", form);
    form.name = "Autre";
    const restored = readSetupDraft("account-c");
    restored.name = "Modifié";
    expect(readSetupDraft("account-c").name).toBe("Restaurant");
    clearSetupDraft("account-c");
  });
});
