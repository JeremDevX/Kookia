import { Prisma, type PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import { getIngredientOutflowEstimates } from "./ingredientOutflowEstimateService.js";

it("reads only recorded receipts and joins their dated recipe to transparent estimates", async () => {
  const from = "2026-09-01";
  const to = "2026-09-30";
  const deliveryDate = new Date("2026-09-15T00:00:00.000Z");
  const db = {
    purchaseReceiptLine: { findMany: vi.fn().mockResolvedValue([
      { id: "tomato-line", productId: "tomatoes", productName: "Tomates", unit: "kg",
        receivedQuantity: new Prisma.Decimal("8"), receipt: { id: "receipt-1", deliveryReference: "BL-2026-01", deliveryDate } },
      { id: "cream-line", productId: "cream", productName: "Crème", unit: "L",
        receivedQuantity: new Prisma.Decimal("3"), receipt: { id: "receipt-2", deliveryReference: "BL-2026-02", deliveryDate } },
    ]) },
    recipeVersion: { findMany: vi.fn().mockResolvedValue([{
      id: "version-row", recipeId: "recipe-1", name: "Salade de tomates", version: 2,
      effectiveFrom: new Date("2026-06-01T00:00:00.000Z"), yieldPortions: 4,
      ingredients: [
        { productId: "tomatoes", productName: "Tomates", productUnit: "kg", quantity: new Prisma.Decimal("0.4") },
        { productId: "oil", productName: "Huile", productUnit: "L", quantity: new Prisma.Decimal("0.04") },
      ],
    }]) },
  } as unknown as PrismaClient;

  const report = await getIngredientOutflowEstimates("restaurant-1", from, to, db);

  expect(db.purchaseReceiptLine.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { restaurantId: "restaurant-1", receivedQuantity: { gt: 0 }, receipt: {
      simulated: false, provenance: "recorded",
      deliveryDate: { gte: new Date("2026-09-01T00:00:00.000Z"), lt: new Date("2026-10-01T00:00:00.000Z") },
    } },
  }));
  expect(db.recipeVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { restaurantId: "restaurant-1", effectiveFrom: { not: null, lte: new Date("2026-09-30T00:00:00.000Z") } },
  }));
  expect(report).toMatchObject({ from, to, assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 },
    estimates: [{ id: "tomato-line:recipe-1:2", receiptId: "receipt-1", receiptReference: "BL-2026-01",
      productId: "tomatoes", receivedQuantity: 8, recipeName: "Salade de tomates", recipeVersion: 2,
      recipeIngredientQuantity: 0.4,
      possiblePortions: 80, estimatedSoldPortions: 72, estimatedLossPortions: 8,
      estimatedSoldQuantity: 7.2, estimatedLossQuantity: 0.8, otherIngredientCount: 1 }],
    unestimatedReceipts: [{ id: "cream-line", receiptId: "receipt-2", receiptReference: "BL-2026-02",
      productId: "cream", productName: "Crème", unit: "L", receivedQuantity: 3,
      reason: "no_dated_compatible_recipe" }],
  });
});
