import { Router, type Response } from "express";
import { prisma } from "../infrastructure/database/prisma.js";

export const workspaceReadRoutes = Router();
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
workspaceReadRoutes.get("/predictions", async (_req, res) => {
  const predictions = await prisma.prediction.findMany({ where: { restaurantId: restaurantId(res) }, include: { product: true }, orderBy: [{ predictedDate: "asc" }, { id: "asc" }] });
  res.json(predictions.map((prediction) => ({
    id: prediction.id, productId: prediction.productId, productName: prediction.product.name,
    predictedDate: prediction.predictedDate.toISOString().slice(0, 10),
    predictedConsumption: Number(prediction.predictedConsumption), confidence: prediction.confidence,
    ...(prediction.action ? { recommendation: { action: prediction.action, quantity: Number(prediction.quantity), reason: prediction.reason } } : {}),
  })));
});
for (const kind of ["analytics", "activity"] as const) {
  workspaceReadRoutes.get(`/${kind}`, async (_req, res) => {
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: restaurantId(res), kind } } });
    res.json(document?.data ?? null);
  });
}

workspaceReadRoutes.get("/insights", async (_req, res) => {
  const id = restaurantId(res);
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: id, kind: "insights" } } });
  res.json(document?.data ?? null);
});
