import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import catalog from "../infrastructure/database/seed/catalog.json" with { type: "json" };
import { isLegacyImportMovement } from "./restaurantSimulationSupport.js";

interface RestaurantSimulationBackupSnapshot {
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

const nonempty = z.string().min(1);
const isoDateOrTimestamp = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
const nonnegativeInt = z.int().min(0).max(2_147_483_647);
const positiveInt = nonnegativeInt.min(1);
const seedProductIds = new Set(catalog.products.map((product) => product.id));
const seedRecipeIds = new Set(catalog.recipes.map((recipe) => recipe.id));
const digest = z.string().regex(/^[0-9a-f]{64}$/);

function decimal(scale: number) {
  return z.union([z.number(), z.string().max(64).regex(/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i)])
    .transform((value) => new Prisma.Decimal(value))
    .refine((value) => value.isFinite() && value.decimalPlaces() <= scale && value.abs().lt(10 ** (14 - scale)));
}

const quantity = decimal(3);
const backupSchema = z.object({
  formatVersion: z.literal(1),
  targetRestaurant: z.literal("La Pizzeria de Camille"),
  restaurantId: nonempty,
  sourceDigest: digest,
  capturedAt: z.iso.datetime({ offset: true }),
  products: z.array(z.object({
    id: nonempty, restaurantId: nonempty, name: nonempty, category: nonempty, currentStock: quantity,
    minThreshold: quantity.refine((value) => value.gte(0)), unit: z.enum(["kg", "L", "dz", "pcs"]), supplierId: nonempty,
    pricePerUnit: decimal(4).refine((value) => value.gte(0)), lastDelivery: isoDateOrTimestamp.nullable(),
  })),
  suppliers: z.array(z.object({ id: nonempty })),
  stockMovements: z.array(z.object({
    id: nonempty, restaurantId: nonempty, productId: nonempty, delta: quantity,
    reason: z.enum(["invoice_import_demo", "simulated_consumption", "simulated_unit_rounding"]),
    operationId: nonempty, actorId: nonempty, createdAt: z.iso.datetime({ offset: true }),
  }).refine(isLegacyImportMovement)),
  recipes: z.array(z.object({
    id: nonempty, restaurantId: nonempty, name: nonempty, category: nonempty, prepTime: nonnegativeInt,
    yieldPortions: positiveInt.optional(), revision: positiveInt.optional(), lastMade: isoDateOrTimestamp.nullable(),
  })),
  recipeIngredients: z.array(z.object({
    restaurantId: nonempty, recipeId: nonempty, productId: nonempty, quantity: quantity.refine((value) => value.gt(0)),
  })),
  productions: z.array(z.never()).length(0),
  saleItems: z.array(z.never()).length(0),
  dailySales: z.array(z.never()).length(0),
  scenarioSaleItemIds: z.array(nonempty).min(1),
  createdSupplierIds: z.array(z.string().regex(/^(?:invoice-supplier-[0-9a-f]{24}|simulation-v1-supplier)$/)).default([]),
}).superRefine((backup, context) => {
  const ids = (rows: { id: string }[]) => new Set(rows.map((row) => row.id));
  const productIds = ids(backup.products);
  const recipeIds = ids(backup.recipes);
  const supplierIds = ids(backup.suppliers);
  const validRows = (rows: { restaurantId: string }[]) => rows.every((row) => row.restaurantId === backup.restaurantId);
  const unique = (keys: string[]) => keys.length === new Set(keys).size;
  const issue = (field: string) => context.addIssue({ code: "custom", path: [field], message: "Lignes incohérentes." });

  if (!validRows(backup.products) || productIds.size !== backup.products.length ||
    [...seedProductIds].some((id) => !productIds.has(id)) || backup.products.some((product) =>
      (!seedProductIds.has(product.id) && !product.id.startsWith("invoice-product-")) || !supplierIds.has(product.supplierId))) issue("products");
  if (supplierIds.size !== backup.suppliers.length) issue("suppliers");
  if (!validRows(backup.stockMovements) || ids(backup.stockMovements).size !== backup.stockMovements.length ||
    !unique(backup.stockMovements.map((movement) => JSON.stringify([movement.operationId, movement.productId]))) ||
    backup.stockMovements.some((movement) => !movement.productId.startsWith("invoice-product-") || !productIds.has(movement.productId))) issue("stockMovements");
  const legacyBalances = new Map<string, Prisma.Decimal>();
  for (const movement of backup.stockMovements) {
    const balance = legacyBalances.get(movement.productId) ?? new Prisma.Decimal(0);
    legacyBalances.set(movement.productId, balance.add(movement.delta));
  }
  if (backup.products.some((product) => product.id.startsWith("invoice-product-") &&
    product.currentStock.sub(legacyBalances.get(product.id) ?? 0).abs().gt(0.001))) issue("stockMovements");
  if (!validRows(backup.recipes) || recipeIds.size !== backup.recipes.length || recipeIds.size !== seedRecipeIds.size ||
    [...seedRecipeIds].some((id) => !recipeIds.has(id))) issue("recipes");
  const recipesWithIngredients = new Set(backup.recipeIngredients.map((ingredient) => ingredient.recipeId));
  if (!validRows(backup.recipeIngredients) ||
    !unique(backup.recipeIngredients.map((ingredient) => JSON.stringify([ingredient.recipeId, ingredient.productId]))) ||
    backup.recipeIngredients.some((ingredient) => !recipeIds.has(ingredient.recipeId) || !seedProductIds.has(ingredient.productId)) ||
    [...recipeIds].some((id) => !recipesWithIngredients.has(id))) issue("recipeIngredients");
  if (!unique(backup.scenarioSaleItemIds)) issue("scenarioSaleItemIds");
  if (!unique(backup.createdSupplierIds) || backup.createdSupplierIds.some((id) => supplierIds.has(id))) issue("createdSupplierIds");
});

export function parseSimulationBackup(contents: string) {
  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error("Le fichier de sauvegarde de la simulation Kookia n’est pas un JSON valide.");
  }
  const parsed = backupSchema.safeParse(data);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0] ?? "format"))].join(", ");
    throw new Error(`Le fichier n’est pas une sauvegarde ciblée de la simulation Kookia (${fields}).`);
  }
  return parsed.data;
}

export function writePrivateSimulationBackup(backup: RestaurantSimulationBackupSnapshot) {
  const contents = JSON.stringify(backup, null, 2);
  parseSimulationBackup(contents);
  const directory = mkdtempSync("/private/tmp/kookia-restaurant-simulation-");
  const path = join(directory, "pre-simulation.json");
  writeFileSync(path, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}
