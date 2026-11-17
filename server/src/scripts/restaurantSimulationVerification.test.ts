import { Prisma } from "@prisma/client";
import { expect, it } from "vitest";
import { scenarioProducts } from "./restaurantSimulationCatalog.js";
import { SIMULATION_MARKER, SIMULATION_VERSION } from "./restaurantSimulationIdentity.js";
import { digestRecipePlan, simulationSaleItems } from "./restaurantSimulationSupport.js";
import {
  hasChangedSimulationProducts, isSimulationProduction, isUnchangedSimulationSale,
  matchesSimulationRecipes, matchesSimulationRecipeVersions,
} from "./restaurantSimulationVerification.js";

it("detects changes to live products while accepting Prisma decimals and the recorded delivery date", () => {
  const { id, name, category, unit } = scenarioProducts[0];
  const state = { id, unit, supplierId: "fixture-supplier", lastDelivery: "2026-09-23",
    closing: 11.25, minThreshold: 1.5, pricePerUnit: 3.4669 };
  const product = { id, name, category, unit, supplierId: state.supplierId, lastDelivery: new Date(state.lastDelivery),
    currentStock: new Prisma.Decimal(state.closing), minThreshold: new Prisma.Decimal(state.minThreshold),
    pricePerUnit: new Prisma.Decimal(state.pricePerUnit) };

  expect(hasChangedSimulationProducts([product], [state])).toBe(false);
  expect(hasChangedSimulationProducts([product], [{ ...state, closing: "11.25" }])).toBe(false);
  expect(hasChangedSimulationProducts([product], [{ ...state, closing: 11.251 }])).toBe(true);
  expect(hasChangedSimulationProducts([{ ...product, lastDelivery: null }], [state])).toBe(true);
  expect(hasChangedSimulationProducts([], [state])).toBe(true);
});

it("checks recipe contents and revisions against the marker", () => {
  const expected = { id: "recipe", name: "Recette", category: "Plat", prepTime: 20, lastMade: "2026-09-24",
    ingredients: [{ productId: "ingredient", quantity: 0.32 }] };
  const recipe = { ...expected, revision: 2, lastMade: new Date(expected.lastMade),
    ingredients: [{ productId: "ingredient", quantity: new Prisma.Decimal(0.32) }] };
  const digest = digestRecipePlan([expected]);

  expect(matchesSimulationRecipes([recipe], digest, { recipe: 2 })).toBe(true);
  expect(matchesSimulationRecipes([{ ...recipe, prepTime: 22 }], digest, { recipe: 2 })).toBe(false);
  expect(matchesSimulationRecipes([recipe], digest, { recipe: 1 })).toBe(false);
});

it("rejects modified sales and unknown or changed recipe versions in generated productions", () => {
  const sale = { createdBy: SIMULATION_MARKER, updatedBy: SIMULATION_MARKER, revision: 0 };
  const production = { actorId: SIMULATION_MARKER, recipeVersionId: "version-id" };
  const version = { actorId: SIMULATION_MARKER, recipeId: "recipe", version: 2,
    operationId: `${SIMULATION_VERSION}:recipe:recipe:v2` };

  expect(isUnchangedSimulationSale(sale)).toBe(true);
  expect(isUnchangedSimulationSale({ ...sale, revision: 1 })).toBe(false);
  expect(isSimulationProduction(production, ["version-id"])).toBe(true);
  expect(isSimulationProduction(production, ["other-id"])).toBe(false);
  expect(matchesSimulationRecipeVersions([version], 1, { recipe: 2 })).toBe(true);
  expect(matchesSimulationRecipeVersions([version], 1, { recipe: 3 })).toBe(false);
});

it("uses the first label for each generated sale item and normalizes its name", () => {
  expect(simulationSaleItems([
    { itemId: "item-1", itemName: "Crème brûlée" },
    { itemId: "item-2", itemName: "Éclair" },
    { itemId: "item-1", itemName: "Crème catalane" },
  ])).toEqual([
    { id: "item-1", name: "Crème brûlée", normalizedName: "creme brulee" },
    { id: "item-2", name: "Éclair", normalizedName: "eclair" },
  ]);
});
