import { expect, it } from "vitest";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { parseSimulationBackup } from "./restaurantSimulationBackup.js";

const restaurantId = "backup-fixture";
const productId = "invoice-product-legacy";
const timestamp = "2026-09-24T10:00:00.000Z";

function backupFixture() {
  const products = catalog.products.map((product) => ({ ...product, restaurantId, lastDelivery: null, stockRevision: 1 }));
  return {
    formatVersion: 1, targetRestaurant: "La Pizzeria de Camille", restaurantId, sourceDigest: "a".repeat(64), capturedAt: timestamp,
    products: [...products, { ...products[0], id: productId, currentStock: "1.250" }],
    suppliers: catalog.suppliers.map(({ id }) => ({ id })),
    stockMovements: [{ id: "legacy-movement", restaurantId, productId, delta: "1.25", reason: "invoice_import_demo",
      operationId: "source-receipt:legacy", actorId: "source-import", createdAt: timestamp }],
    recipes: catalog.recipes.map(({ id, name, category, prepTime, lastMade }) => ({
      restaurantId, id, name, category, prepTime, lastMade: lastMade ?? null,
    })),
    recipeIngredients: catalog.recipes.flatMap(({ id, ingredients }) => ingredients.map((ingredient) => ({
      ...ingredient, restaurantId, recipeId: id,
    }))),
    productions: [], saleItems: [], dailySales: [], scenarioSaleItemIds: ["generated-sale-item"],
  };
}

it("reads version 1 snapshots with decimal strings, numeric seed fields and pre-versioned recipes", () => {
  const fixture = backupFixture();
  const parsed = parseSimulationBackup(JSON.stringify(fixture));
  expect(parsed.products.at(-1)?.currentStock.toString()).toBe("1.25");
  expect(parsed.products[0].currentStock.toNumber()).toBe(catalog.products[0].currentStock);
  expect(parsed.products[0]).not.toHaveProperty("stockRevision");
  expect(parsed.recipes[0]).not.toHaveProperty("yieldPortions");
  expect(parsed.createdSupplierIds).toEqual([]);
  const modern = parseSimulationBackup(JSON.stringify({ ...fixture, recipes: fixture.recipes.map((recipe) => ({
    ...recipe, yieldPortions: 1, revision: 1,
  })), createdSupplierIds: ["simulation-v1-supplier"] }));
  expect(modern.recipes[0]).toMatchObject({ yieldPortions: 1, revision: 1 });
  expect(modern.createdSupplierIds).toEqual(["simulation-v1-supplier"]);
});

it("rejects invalid format and nested rows without reporting their contents", () => {
  const fixture = backupFixture();
  expect(() => parseSimulationBackup("{")).toThrow("JSON valide");
  for (const [field, value] of [
    ["sourceDigest", "corrupted"],
    ["products", [{ ...fixture.products[0], currentStock: "Infinity" }, ...fixture.products.slice(1)]],
    ["products", [{ ...fixture.products[0], lastDelivery: "2026-09-31" }, ...fixture.products.slice(1)]],
    ["stockMovements", [{ ...fixture.stockMovements[0], delta: "1.2501" }]],
    ["stockMovements", [{ ...fixture.stockMovements[0], operationId: "arbitrary-operation" }]],
    ["stockMovements", [{ ...fixture.stockMovements[0], delta: 2 }]],
    ["recipeIngredients", [{ ...fixture.recipeIngredients[0], restaurantId: "foreign" }, ...fixture.recipeIngredients.slice(1)]],
    ["recipeIngredients", [...fixture.recipeIngredients, fixture.recipeIngredients[0]]],
    ["recipes", fixture.recipes.slice(1)],
    ["createdSupplierIds", [fixture.suppliers[0].id]],
    ["scenarioSaleItemIds", ["generated-sale-item", "generated-sale-item"]],
  ] as const) {
    expect(() => parseSimulationBackup(JSON.stringify({ ...fixture, [field]: value }))).toThrow(new RegExp(`\\b${field}\\b`));
  }
});
