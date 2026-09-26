import { Router, type Response } from "express";
import { z } from "zod";
import { sheetInputSchema, slotSchema } from "../../../shared/serviceOperations.js";
import { getServiceSheet, saveServiceSheet } from "../application/workspace/serviceSheetService.js";

export const serviceSheetRoutes = Router();
const workspace = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const query = z.object({ date: z.iso.date(), slot: slotSchema }).strict();
serviceSheetRoutes.get("/services/sheet", async (req, res, next) => {
  try { const { date, slot } = query.parse(req.query); res.json(await getServiceSheet(workspace(res).restaurantId, date, slot)); }
  catch (error) { next(error); }
});
serviceSheetRoutes.post("/services/sheet", async (req, res, next) => {
  try { const { restaurantId, actorId } = workspace(res);
    res.json(await saveServiceSheet(restaurantId, actorId, sheetInputSchema.parse(req.body))); }
  catch (error) { next(error); }
});
