import { describe, expect, it } from "vitest";
import { hasPendingServiceSheetFields } from "./serviceSheetPendingFields";

const empty = { recipeId: "", portions: 0, fromRecipeId: "", toRecipeId: "", replacementPortions: 1, replacementNote: "" };

describe("champs de fiche en cours de saisie", () => {
  it("ne bloque pas une fiche sans saisie intermédiaire", () => {
    expect(hasPendingServiceSheetFields(empty)).toBe(false);
  });
  it.each([
    { recipeId: "recipe" }, { portions: 2 }, { fromRecipeId: "from" }, { toRecipeId: "to" },
    { replacementPortions: 2 }, { replacementPortions: 0 }, { replacementNote: "Note" },
  ])("détecte chaque champ non ajouté : %o", (change) => {
    expect(hasPendingServiceSheetFields({ ...empty, ...change })).toBe(true);
  });
});
