import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ServiceMenu } from "../../../shared/serviceOperations";
import { menuDraft } from "./serviceMenuDraft";
import ServiceMenuEditor, { ServiceMenuHistory } from "./ServiceMenuEditor";
const menu: ServiceMenu = { id: "version", serviceDate: "2026-10-01", slot: "lunch", revision: 3, note: "Carte revue", createdAt: null,
  entries: [{ id: "entry", name: "Formule déjeuner", category: "Formule", saleItemId: "sale", available: false, priceCents: 1800,
    components: [{ recipeId: "salad", portions: 1, recipeName: "Salade", recipeVersionId: "v1", recipeVersion: 2, category: "Entrée", yieldPortions: 4, ingredients: [] },
      { recipeId: "tea", portions: 1, recipeName: "Thé", recipeVersionId: "v2", recipeVersion: 1, category: "Boisson", yieldPortions: 1, ingredients: [] }] }] };
describe("service menu UI", () => {
  it("keeps formula components, prices, availability and historical recipe versions", () => {
    const html = renderToStaticMarkup(createElement(ServiceMenuHistory, { history: [menu] }));
    expect(html).toContain("Formule déjeuner"); expect(html).toContain("indisponible"); expect(html).toContain("18,00");
    expect(html).toContain("Salade"); expect(html).toContain("Thé"); expect(html).toContain("recette version 2");
  });
  it("renders loading, no stock deduction and non duplicated formula sales guidance", () => {
    const html = renderToStaticMarkup(createElement(ServiceMenuEditor, { date: "2026-10-01", slot: "lunch" }));
    expect(html).toContain("Chargement de la carte"); expect(html).toContain("jamais les deux"); expect(html).toContain("ne déduit aucune matière");
  });
  it("maps saved evidence to an editable input without stripping formula composition", () => {
    const entries = menuDraft(menu);
    expect(entries[0].components).toEqual([{ recipeId: "salad", portions: 1 }, { recipeId: "tea", portions: 1 }]);
    entries[0].components[0].portions = 2;
    expect(menu.entries[0].components[0].portions).toBe(1);
    expect(entries[0]).toMatchObject({ priceCents: 1800, available: false, saleItemId: "sale" });
  });
});
