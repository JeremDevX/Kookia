import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { ESTIMATED_LOSS_SHARE, ESTIMATED_SALES_SHARE, estimateIngredientOutflows } from "./ingredientOutflowEstimatePolicy.js";

type EstimateDatabase = PrismaClient | Prisma.TransactionClient;
const dateAt = (value: string) => new Date(`${value}T00:00:00.000Z`);
const nextDate = (value: string) => new Date(dateAt(value).getTime() + 86_400_000);
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

export async function getIngredientOutflowEstimates(restaurantId: string, from: string, to: string,
  db: EstimateDatabase = prisma) {
  const [receiptLines, recipeVersions] = await Promise.all([
    db.purchaseReceiptLine.findMany({
      where: { restaurantId, receivedQuantity: { gt: 0 }, receipt: {
        simulated: false, provenance: "recorded", deliveryDate: { gte: dateAt(from), lt: nextDate(to) },
      } },
      select: { id: true, productId: true, productName: true, unit: true, receivedQuantity: true,
        receipt: { select: { id: true, deliveryReference: true, deliveryDate: true } } },
    }),
    db.recipeVersion.findMany({ where: { restaurantId, effectiveFrom: { not: null, lte: dateAt(to) } },
      select: { id: true, recipeId: true, name: true, version: true, effectiveFrom: true, yieldPortions: true,
        ingredients: { select: { productId: true, productName: true, productUnit: true, quantity: true } } } }),
  ]);

  const { estimates, unestimatedReceipts } = estimateIngredientOutflows(receiptLines.map((line) => ({
    id: line.id, receiptId: line.receipt.id, receiptReference: line.receipt.deliveryReference,
    deliveryDate: dateOnly(line.receipt.deliveryDate), productId: line.productId, productName: line.productName,
    unit: line.unit, receivedQuantity: Number(line.receivedQuantity),
  })), recipeVersions.flatMap((version) => version.effectiveFrom ? [{
    recipeId: version.recipeId, recipeName: version.name, version: version.version,
    effectiveFrom: dateOnly(version.effectiveFrom), yieldPortions: version.yieldPortions,
    ingredients: version.ingredients.map((ingredient) => ({ productId: ingredient.productId,
      productName: ingredient.productName, unit: ingredient.productUnit, quantity: Number(ingredient.quantity) })),
  }] : []));

  return { from, to, assumptions: { estimatedSalesShare: ESTIMATED_SALES_SHARE,
    estimatedLossShare: ESTIMATED_LOSS_SHARE }, estimates, unestimatedReceipts };
}
