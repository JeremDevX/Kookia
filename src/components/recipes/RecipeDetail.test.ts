import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import RecipeDetail from "./RecipeDetail";

it("affiche les ingrédients enregistrés et signale les étapes absentes", () => {
  const html = renderToStaticMarkup(createElement(RecipeDetail, {
    recipe: { id: "r1", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 4,
      revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 4,
      ingredients: [{ productId: "p1", productName: "Carotte", quantity: 500, unit: "g" }] },
    editing: false, onBack: () => {}, onEdit: () => {}, onProduce: () => {},
  }));
  expect(html).toContain("Soupe");
  expect(html).toContain("Carotte");
  expect(html).toContain("500 g");
  expect(html).toContain("Étapes non renseignées.");
  expect(html).toContain("Produire");
});
