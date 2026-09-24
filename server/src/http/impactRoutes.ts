import { Router } from "express";
import { z } from "zod";
import { getImpactReport } from "../application/workspace/impactService.js";

export const impactRoutes = Router();
const periodSchema = z.object({ from: z.iso.date(), to: z.iso.date() }).strict()
  .refine((period) => period.from <= period.to, { message: "La date de début doit précéder la date de fin." });

impactRoutes.get("/impact", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    res.json(await getImpactReport(restaurantId, period.from, period.to));
  } catch (error) { next(error); }
});
