import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface RestaurantSimulationBackup {
  formatVersion: 1;
  targetRestaurant: "La Pizzeria de Camille";
  restaurantId: string;
  sourceDigest: string;
  capturedAt: string;
  products: unknown[];
  suppliers: unknown[];
  stockMovements: unknown[];
  recipes: unknown[];
  recipeIngredients: unknown[];
  productions: unknown[];
  saleItems: unknown[];
  dailySales: unknown[];
  scenarioSaleItemIds: string[];
  createdSupplierIds: string[];
}

export function writePrivateSimulationBackup(backup: RestaurantSimulationBackup) {
  const directory = mkdtempSync("/private/tmp/kookia-restaurant-simulation-");
  const path = join(directory, "pre-simulation.json");
  writeFileSync(path, JSON.stringify(backup, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}
