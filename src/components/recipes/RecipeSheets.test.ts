import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Recipe } from "../../types";
import RecipeSheets from "./RecipeSheets";

const recipe: Recipe = { id: "r1", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 4,
  revision: 1, version: 1, effectiveFrom: null, ingredients: [], versions: [] };

describe("fiches techniques", () => {
  it("distingue un coût indisponible d’un coût nul", () => {
    const html = renderToStaticMarkup(createElement(RecipeSheets, {
      recipes: [recipe], loading: false, costPerPortion: () => null, onEdit: () => {},
    }));
    expect(html).toContain("Indisponible");
    expect(html).toContain("À compléter");
    expect(html).toContain("Modifier la fiche Soupe");
    expect(html).not.toContain("0,00");
  });
  it("indique un catalogue vide", () => {
    const html = renderToStaticMarkup(createElement(RecipeSheets, {
      recipes: [], loading: false, costPerPortion: () => null, onEdit: () => {},
    }));
    expect(html).toContain("Aucune fiche enregistrée.");
  });
  it("désactive la modification quand une recette est en cours d’édition", () => {
    const html = renderToStaticMarkup(createElement(RecipeSheets, { recipes: [recipe], loading: false, editing: true, costPerPortion: () => null, onEdit: () => {} }));
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Modifier la fiche Soupe"|<button[^>]*aria-label="Modifier la fiche Soupe"[^>]*disabled/);
  });

});
