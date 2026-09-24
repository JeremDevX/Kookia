import { Router } from "express";
import { z } from "zod";
import { calendarMonthCount, getImpactReport, MAX_MONTHLY_IMPACT_MONTHS } from "../application/workspace/impactService.js";

export const impactRoutes = Router();
const periodSchema = z.object({ from: z.iso.date(), to: z.iso.date(), monthly: z.enum(["true"]).optional() }).strict()
  .refine((period) => period.from <= period.to, { message: "La date de début doit précéder la date de fin." })
  .refine((period) => period.monthly !== "true" || calendarMonthCount(period.from, period.to) <= MAX_MONTHLY_IMPACT_MONTHS,
    { message: `La réconciliation mensuelle est limitée à ${MAX_MONTHLY_IMPACT_MONTHS} mois calendaires.` });

impactRoutes.get("/impact", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    res.json(await getImpactReport(restaurantId, period.from, period.to, undefined, { includeMonthly: period.monthly === "true" }));
  } catch (error) { next(error); }
});
