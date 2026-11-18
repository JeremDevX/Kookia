import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { prisma } from "../../infrastructure/database/prisma.js";
import { createProduct } from "./catalogService.js";
import { ensureWorkspace } from "./ensureWorkspace.js";
import { getImpactReport } from "./impactService.js";
import { simulationActor } from "./operationProvenance.js";
import { createRecipe } from "./recipeService.js";
import { getOperationalReport } from "./reportService.js";
import { getServiceSheet } from "./serviceSheetService.js";
import { applyStockMovement } from "./stockWrite.js";
import { listWaste } from "./wasteService.js";
import { applyWorkshopKitchen } from "./workshopKitchen.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";

const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

it("imports dated preparations, refusals and losses outside measured activity without crediting stock twice", async () => {
  const email = `workshop-kitchen-${randomUUID()}@example.com`;
  const owner = await prisma.user.create({ data: { email, emailNormalized: email, displayName: "Cuisine de test", passwordHash: "not-a-login" } });
  users.push(owner.id);
  const { id: restaurantId } = await ensureWorkspace(owner.id);
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { restaurantId } });
  const product = await createProduct(restaurantId, owner.id, { name: "Carottes de test", category: "Légumes", unit: "kg",
    currentStock: 4, minThreshold: 1, supplierId: supplier.id, pricePerUnit: 2 }, randomUUID());
  const date = "2026-08-15";
  const recipe = await createRecipe(restaurantId, owner.id, randomUUID(), { name: "Carottes de l’atelier", category: "Entrée",
    prepTime: 20, yieldPortions: 10, effectiveFrom: date, ingredients: [{ productId: product.id, quantity: 2 }] });
  const version = await prisma.recipeVersion.findFirstOrThrow({ where: { restaurantId, recipeId: recipe.id } });
  const lot = await prisma.stockLot.findFirstOrThrow({ where: { restaurantId, productId: product.id } });
  const movement = await prisma.$transaction(tx => applyStockMovement(tx, { restaurantId, productId: product.id, delta: -0.5,
    actorId: simulationActor, operationId: `workshop-stock:v1:${date}:lot-test:loss`, reason: "simulation_loss", productUnitSnapshot: "kg" },
  { lots: { selectedLotId: lot.id } }));
  const earlier = "2026-08-14";
  const raw = { kind: "raw", slot: null, recipe: null, product: product.name, lotReference: "lot-test", quantityMilli: 500,
    unit: "kg", avoidable: false, note: "Lot écarté" } as const;
  const operations: WorkshopOperationsInput = { purchases: [], incident: "normal", events: [],
    services: [{ slot: "lunch", covers: 3, items: [{ name: recipe.name, category: "Entrée", prepTime: 20, priceCents: 900,
      planned: 5, prepared: 4, sold: 3, refused: 1 }] }], losses: [raw, { kind: "unsold", slot: "lunch", recipe: recipe.name,
      product: null, lotReference: null, quantityMilli: 1000, unit: "portion", avoidable: true, note: "Une portion écartée" }] };
  const beforeCount = await prisma.stockMovement.count({ where: { restaurantId } });
  for (const day of [date, earlier]) await prisma.$transaction(tx => applyWorkshopKitchen(tx, restaurantId, day, operations));

  const productions = await prisma.production.findMany({ where: { restaurantId }, orderBy: [{ date: "asc" }, { kind: "asc" }] });
  expect(productions.map(row => [row.kind, row.portions, row.recipeVersionId, row.actorId])).toEqual([
    ["production", 4, null, simulationActor], ["refusal", 1, null, simulationActor],
    ["production", 4, version.id, simulationActor], ["refusal", 1, version.id, simulationActor],
  ]);
  const wastes = await listWaste(restaurantId);
  expect(wastes.map(row => row.serviceDate)).toEqual([date, date, earlier, earlier]);
  expect(wastes.find(row => row.serviceDate === date && row.kind === "raw"))
    .toMatchObject({ lotId: lot.id, stockMovementId: movement.id, simulated: true, quantity: 0.5 });
  expect(wastes.find(row => row.serviceDate === earlier && row.kind === "raw"))
    .toMatchObject({ lotId: null, stockMovementId: null, simulated: true });
  expect(wastes.find(row => row.serviceDate === date && row.kind === "unsold"))
    .toMatchObject({ productionId: productions[2].id, stockMovementId: null, simulated: true, quantity: 1 });
  expect(await prisma.stockMovement.count({ where: { restaurantId } })).toBe(beforeCount);
  expect((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } })).currentStock.toNumber()).toBe(3.5);
  const impact = await getImpactReport(restaurantId, earlier, date);
  expect(impact.current.recorded.declaredWaste).toMatchObject({ records: [], excludedSimulationCount: 4 });
  const report = await getOperationalReport(restaurantId, earlier, date);
  expect(report.rows.some(row => row.section === "Productions et refus" || row.section === "Pertes et déchets déclarés par service")).toBe(false);
  const sheet = await getServiceSheet(restaurantId, date, "lunch");
  expect(sheet.facts.productionIds).toEqual([]);
});
