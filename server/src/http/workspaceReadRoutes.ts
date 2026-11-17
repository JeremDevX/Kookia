import { Router } from "express";
import { prisma } from "../infrastructure/database/prisma.js";
import { workspaceContext } from "./workspaceContext.js";

export const workspaceReadRoutes = Router();
for (const kind of ["analytics", "activity"] as const) {
  workspaceReadRoutes.get(`/${kind}`, async (_req, res) => {
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: workspaceContext(res).restaurantId, kind } } });
    res.json(document?.data ?? null);
  });
}

workspaceReadRoutes.get("/insights", async (_req, res) => {
  const id = workspaceContext(res).restaurantId;
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: id, kind: "insights" } } });
  res.json(document?.data ?? null);
});
