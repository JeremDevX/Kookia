import { Router } from "express";
import { z } from "zod";
import { sheetInputSchema, slotSchema } from "../../../shared/serviceOperations.js";
import { getServiceSheet, saveServiceSheet } from "../application/workspace/serviceSheetService.js";
import { workspaceContext as workspace } from "./workspaceContext.js";

export const serviceSheetRoutes = Router();
const query = z.object({ date: z.iso.date(), slot: slotSchema }).strict();
serviceSheetRoutes.get("/services/sheet", async (req, res) => {
  const { date, slot } = query.parse(req.query); res.json(await getServiceSheet(workspace(res).restaurantId, date, slot));
});
serviceSheetRoutes.post("/services/sheet", async (req, res) => {
  const { restaurantId, actorId } = workspace(res);
  res.json(await saveServiceSheet(restaurantId, actorId, sheetInputSchema.parse(req.body)));
});
