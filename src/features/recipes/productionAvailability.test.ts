import { expect, it } from "vitest";
import { recipeStockWarnings } from "./productionAvailability";
import type { Product, Recipe } from "../../types";
const recipe = { ingredients: [{ productId: "p" }] } as Recipe;
const product = { id: "p", name: "Tomate", unit: "kg", currentStock: 12, availableForProduction: 9,
  expiredStock: 3, unknownExpiryStock: 4 } as Product;
it("makes expired exclusion and unknown expiry human review explicit", () => {
  const warnings = recipeStockWarnings(recipe, [product]);
  expect(warnings).toHaveLength(2); expect(warnings[0]).toContain("3 kg à échéance dépassée");
  expect(warnings[1]).toContain("4 kg sans échéance renseignée");
});
it("identifies legacy or mismatched data instead of claiming qualified freshness", () => {
  expect(recipeStockWarnings(recipe, [{ ...product, availableForProduction: undefined, expiredStock: 0, unknownExpiryStock: 0 }])[0]).toContain("solde historique");
  expect(recipeStockWarnings(recipe, [{ ...product, lotStockMismatch: true }])[0]).toContain("ne correspondent pas");
});
