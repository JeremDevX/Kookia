import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ensureWorkspace } from "./ensureWorkspace.js";
import { adjustStock, createProduct } from "./catalogService.js";
import { recordStockCount } from "./stockCountService.js";
import { createRecipe, recordProduction } from "./recipeService.js";
import { getImpactReport } from "./impactService.js";
import { getOperationalReport } from "./reportService.js";
import { recordWaste, listWaste } from "./wasteService.js";
const users: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

async function stockFixture() {
  const email = `lot-test-${randomUUID()}@example.com`;
  const owner = await prisma.user.create({ data: { email, emailNormalized: email, displayName: "Lot fixture", passwordHash: "not-a-login" } });
  const actorId = owner.id;
  users.push(actorId);
  const { id: restaurantId } = await ensureWorkspace(actorId);
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { restaurantId } });
  const addProduct = (name: string) => createProduct(restaurantId, actorId, { name, category: "Légumes", unit: "kg",
    currentStock: 10, minThreshold: 1, supplierId: supplier.id, pricePerUnit: 2 }, randomUUID());
  return { owner, restaurantId, addProduct };
}

describe("lot and waste mutations", () => {
  it("keeps stock and allocations atomic, rejects foreign lots and does not re-deduct cooked waste", async () => {
    const { owner, restaurantId, addProduct } = await stockFixture();
    const product = await addProduct("Isolated potato");
    const initial = await prisma.stockLot.findFirstOrThrow({ where: { restaurantId, productId: product.id } });
    expect(initial.receivedAt).toBeNull(); expect(initial.expiresAt).toBeNull();
    await prisma.stockLot.update({ where: { id: initial.id }, data: { expiresAt: new Date("2025-12-31") } });
    const expiredRecipe = await createRecipe(restaurantId, owner.id, randomUUID(), { name: "Expired fixture", category: "Plat", prepTime: 1, yieldPortions: 1, effectiveFrom: "2026-01-01", ingredients: [{ productId: product.id, quantity: 1 }] });
    await expect(recordProduction(restaurantId, owner.id, { operationId: randomUUID(), recipeId: expiredRecipe.id, expectedRecipeRevision: 1, recipeName: expiredRecipe.name, portions: 1, prepTime: 1, notes: "", date: "2026-01-01", kind: "production" })).rejects.toMatchObject({ code: "INSUFFICIENT_LOT_STOCK" });
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } })).currentStock)).toBe(10);
    await prisma.stockLot.update({ where: { id: initial.id }, data: { expiresAt: new Date("2026-02-01"), unitCost: 2 } });
    await adjustStock(restaurantId, owner.id, product.id, -2, randomUUID(), "adjustment", product.stockRevision, product.unit);
    expect(Number((await prisma.stockLot.findUniqueOrThrow({ where: { id: initial.id } })).remainingQuantity)).toBe(8);
    const current = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } });
    await recordStockCount(restaurantId, owner.id, product.id, { operationId: randomUUID(), expectedStockRevision: current.stockRevision, expectedUnit: "kg", countedQuantity: 9 });
    const lots = await prisma.stockLot.findMany({ where: { restaurantId, productId: product.id } });
    expect(lots.reduce((sum, lot) => sum + Number(lot.remainingQuantity), 0)).toBe(9);
    const recipe = await createRecipe(restaurantId, owner.id, randomUUID(), { name: "Beverage fixture", category: "Boisson", prepTime: 5, yieldPortions: 2, effectiveFrom: "2026-01-01", ingredients: [{ productId: product.id, quantity: 2, netQuantity: 1.5 }] });
    expect(recipe.category).toBe("Boisson");
    const production = await recordProduction(restaurantId, owner.id, { operationId: randomUUID(), recipeId: recipe.id, expectedRecipeRevision: 1, recipeName: recipe.name, portions: 2, prepTime: 5, notes: "", date: "2026-01-01", serviceSlot: "lunch", kind: "production" });
    const parure = { operationId: randomUUID(), serviceDate: "2026-01-01", kind: "preparation" as const, avoidability: "inedible" as const, productionId: production.id, productId: product.id, quantity: 0.5, unit: "kg", note: "Parures mesurées" };
    expect((await recordWaste(restaurantId, owner.id, parure)).stockMovementId).toBeNull();
    await expect(recordWaste(restaurantId, owner.id, { ...parure, operationId: randomUUID(), quantity: 0.1 })).rejects.toMatchObject({ code: "PREPARATION_WASTE_EXCEEDS_YIELD" });
    const input = { operationId: randomUUID(), serviceDate: "2026-01-01", serviceSlot: "lunch", kind: "unsold" as const, avoidability: "avoidable" as const, productionId: production.id, quantity: 1, unit: "portion", note: "Confirmed discard" };
    const waste = await recordWaste(restaurantId, owner.id, input);
    expect(waste.stockMovementId).toBeNull(); expect((await recordWaste(restaurantId, owner.id, input)).id).toBe(waste.id);
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } })).currentStock)).toBe(7);
    await expect(recordWaste(restaurantId, owner.id, { ...input, operationId: randomUUID(), quantity: 2 })).rejects.toMatchObject({ code: "WASTE_EXCEEDS_PRODUCTION" });
    await expect(recordWaste(restaurantId, owner.id, { operationId: randomUUID(), serviceDate: "2026-01-01", kind: "raw", avoidability: "avoidable", productId: product.id, lotId: randomUUID(), quantity: 1, unit: "kg", note: "" })).rejects.toMatchObject({ code: "INVALID_LOT" });
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } })).currentStock)).toBe(7);
    const raw = await recordWaste(restaurantId, owner.id, { operationId: randomUUID(), serviceDate: "2026-01-01", kind: "raw", avoidability: "avoidable", productId: product.id, lotId: initial.id, quantity: 0.25, unit: "kg", note: "Measured raw loss" });
    expect((await listWaste(restaurantId)).find((row) => row.id === raw.id)).toMatchObject({ cost: 0.5, valuation: "lot_cost" });
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } })).currentStock)).toBe(6.75);
    const currentLots = await prisma.stockLot.findMany({ where: { restaurantId, productId: product.id } });
    expect(currentLots.reduce((sum, row) => sum + Number(row.remainingQuantity), 0)).toBe(6.75);
    const datedRaw = await recordWaste(restaurantId, owner.id, { operationId: randomUUID(), serviceDate: "2026-01-31", kind: "raw", avoidability: "avoidable", productId: product.id, lotId: initial.id, quantity: 0.5, unit: "kg", note: "Backdated service declaration" });
    await recordWaste(restaurantId, owner.id, { ...input, operationId: randomUUID(), serviceDate: "2026-02-01", kind: "plate_return", quantity: 1 });
    const impact = await getImpactReport(restaurantId, "2026-01-01", "2026-02-28", prisma, { includeMonthly: true });
    expect(impact.current.recorded.lossMovementCount).toBe(2);
    expect(impact.current.recorded.knownLossCost).toBe(1.5);
    expect(impact.current.recorded.lossesByProduct[0].quantity).toBe(0.75);
    expect(impact.current.recorded.declaredWaste.records).toHaveLength(5);
    expect(impact.current.recorded.declaredWaste.totals).toContainEqual({ kind: "preparation", avoidability: "inedible", unit: "kg", quantity: 0.5, recordCount: 1 });
    expect(impact.current.recorded.declaredWaste.totals).toContainEqual({ kind: "plate_return", avoidability: "avoidable", unit: "portion", quantity: 1, recordCount: 1 });
    if (!("monthly" in impact)) throw new Error("Monthly projection missing");
    expect(impact.monthly?.find((row) => row.month === "2026-01")?.recorded).toMatchObject({ lossMovementCount: 2, knownLossCost: 1.5 });
    expect(impact.monthly?.find((row) => row.month === "2026-02")?.recorded).toMatchObject({ lossMovementCount: 0, knownLossCost: 0 });
    const report = await getOperationalReport(restaurantId, "2026-01-31", "2026-01-31");
    expect(report.declaredWaste.records.map((row) => row.id)).toEqual([datedRaw.id]);
    expect(report.declaredLosses.reportedMovementCount).toBe(1);
    expect(report.rows.filter((row) => row.section === "Pertes et déchets déclarés par service")).toHaveLength(2);
    expect(report.rows.find((row) => row.metric === "Coût connu des lots (EUR)")?.value).toBe("1.00");
    const withoutDouble = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } });
    expect(Number(withoutDouble.currentStock)).toBe(6.25);
    await prisma.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } }, data: { unit: "L" } });
    const retainedUnit = await getImpactReport(restaurantId, "2026-01-01", "2026-02-28");
    expect(retainedUnit.current.recorded.lossesByProduct[0]).toMatchObject({ unit: "kg", quantity: 0.75, knownCost: 1.5 });
    expect(retainedUnit.current.recorded.declaredWaste.totals.some((row) => row.unit === "L")).toBe(false);


  });

  it("accepts only one concurrent write against the same stock revision and replays its movement once", async () => {
    const { owner, restaurantId, addProduct } = await stockFixture();
    const product = await addProduct("Concurrent stock");
    const adjustmentId = randomUUID();
    const countInput = { operationId: randomUUID(), expectedStockRevision: product.stockRevision,
      expectedUnit: product.unit, countedQuantity: 6 };
    const adjust = () => adjustStock(restaurantId, owner.id, product.id, -2, adjustmentId,
      "adjustment", product.stockRevision, product.unit);
    const count = () => recordStockCount(restaurantId, owner.id, product.id, countInput);
    const [adjustment, counting] = await Promise.allSettled([adjust(), count()]);
    expect([adjustment.status, counting.status].sort()).toEqual(["fulfilled", "rejected"]);

    const adjusted = adjustment.status === "fulfilled";
    await expect(adjusted ? count() : adjust()).rejects.toMatchObject({ code: "STOCK_CHANGED" });
    await (adjusted ? adjust() : count());
    const movements = await prisma.stockMovement.findMany({ where: { restaurantId, productId: product.id, reason: { not: "initial" } },
      include: { lotAllocations: true } });
    expect(movements).toHaveLength(1);
    expect(movements[0].operationId).toBe(adjusted ? adjustmentId : `stock-count:${countInput.operationId}`);
    expect(movements[0].lotAllocations.map((allocation) => Number(allocation.quantity))).toEqual([adjusted ? 2 : 4]);
    const current = await prisma.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id: product.id } } });
    const lot = await prisma.stockLot.findFirstOrThrow({ where: { restaurantId, productId: product.id } });
    expect(current.stockRevision).toBe(product.stockRevision + 1);
    expect(Number(current.currentStock)).toBe(adjusted ? 8 : 6);
    expect(lot.remainingQuantity).toEqual(current.currentStock);
  });

  it("rolls back every movement and allocation when production cannot use the last ingredient", async () => {
    const { owner, restaurantId, addProduct } = await stockFixture();
    const products = await Promise.all([addProduct("First ingredient"), addProduct("Second ingredient")]);
    const productIds = products.map(({ id }) => id).sort((a, b) => a.localeCompare(b));
    const lastLot = await prisma.stockLot.findFirstOrThrow({ where: { restaurantId, productId: productIds[1] } });
    await prisma.stockLot.update({ where: { id: lastLot.id }, data: { expiresAt: new Date("2026-01-01") } });
    const recipe = await createRecipe(restaurantId, owner.id, randomUUID(), { name: "Two ingredient fixture", category: "Plat",
      prepTime: 1, yieldPortions: 1, effectiveFrom: "2026-01-01", ingredients: productIds.map((productId) => ({ productId, quantity: 2 })) });
    const input = { operationId: randomUUID(), recipeId: recipe.id, expectedRecipeRevision: 1, recipeName: recipe.name,
      portions: 1, prepTime: 1, notes: "", date: "2026-01-02", kind: "production" as const };
    const produce = () => recordProduction(restaurantId, owner.id, input);
    const stock = () => Promise.all([
      prisma.product.findMany({ where: { restaurantId, id: { in: productIds } }, orderBy: { id: "asc" },
        select: { id: true, currentStock: true, stockRevision: true } }),
      prisma.stockLot.findMany({ where: { restaurantId, productId: { in: productIds } }, orderBy: { id: "asc" },
        include: { allocations: true } }),
    ]);
    const movements = () => prisma.stockMovement.findMany({ where: { restaurantId, operationId: input.operationId },
      include: { lotAllocations: true } });
    const before = await stock();
    await expect(produce()).rejects.toMatchObject({ code: "INSUFFICIENT_LOT_STOCK" });
    expect(await stock()).toEqual(before);
    expect(await movements()).toHaveLength(0);
    expect(await prisma.production.count({ where: { restaurantId, operationId: input.operationId } })).toBe(0);

    await prisma.stockLot.update({ where: { id: lastLot.id }, data: { expiresAt: null } });
    const [saved, replay] = await Promise.all([produce(), produce()]);
    expect(replay.id).toBe(saved.id);
    const written = await movements();
    expect(written.map((movement) => movement.productId).sort()).toEqual([...productIds].sort());
    expect(written.map((movement) => Number(movement.delta))).toEqual([-2, -2]);
    expect(written.map((movement) => movement.lotAllocations.map((allocation) => Number(allocation.quantity)))).toEqual([[2], [2]]);
  });
});
