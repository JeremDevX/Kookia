import { Router, type Response } from "express";
import { prisma } from "../infrastructure/database/prisma.js";

export const workspaceReadRoutes = Router();
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
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
