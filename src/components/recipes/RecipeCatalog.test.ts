import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { Recipe } from "../../types";
import RecipeCatalog from "./RecipeCatalog";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => react.useState(initial === "all" ? "Entrée" : initial) };
});

it("affiche toutes les recettes lorsque la catégorie sélectionnée disparaît", () => {
  const recipe = { id: "r1", name: "Soupe", category: "Plat", ingredients: [], versions: [],
    prepTime: 10, yieldPortions: 1, revision: 1, version: 1, effectiveFrom: null, maxYield: 0 } as Recipe & { maxYield: number };
  const html = renderToStaticMarkup(createElement(RecipeCatalog, {
    recipes: [recipe], loading: false, onEdit: () => {}, onProduce: () => {},
  }));
  expect(html).toContain("Soupe");
  expect(html).toContain('value="all" selected');
  expect(html).not.toContain("Aucune recette ne correspond");
});


it("nomme les actions avec la recette concernée", () => {
  const recipe = { id: "r1", name: "Soupe", category: "Plat", ingredients: [], versions: [],
    prepTime: 10, yieldPortions: 1, revision: 1, version: 1, effectiveFrom: null, maxYield: 2 } as Recipe & { maxYield: number };
  const html = renderToStaticMarkup(createElement(RecipeCatalog, {
    recipes: [recipe, { ...recipe, id: "r2", name: "Gratin" }], loading: false, onEdit: () => {}, onProduce: () => {},
  }));
  for (const name of ["Soupe", "Gratin"]) {
    expect(html).toContain(`aria-label="Modifier la recette ${name}"`);
    expect(html).toContain(`aria-label="Produire ${name}"`);
  }
});
