import { Router } from "express";
import { z } from "zod";
import { impactMonthPageCount } from "../application/workspace/impactMonthPolicy.js";
import { getImpactReport } from "../application/workspace/impactService.js";

export const impactRoutes = Router();
const periodSchema = z.object({ from: z.iso.date(), to: z.iso.date(), monthly: z.enum(["true"]).optional(),
  monthlyPage: z.coerce.number().int().nonnegative().optional() }).strict()
  .refine((period) => period.from <= period.to, { message: "La date de début doit précéder la date de fin." })
  .refine((period) => period.monthly === "true" || period.monthlyPage === undefined,
    { message: "La page mensuelle doit accompagner une demande de réconciliation mensuelle.", path: ["monthlyPage"] })
  .refine((period) => period.monthly !== "true" || period.from > period.to ||
    (period.monthlyPage ?? 0) < impactMonthPageCount(period.from, period.to),
  { message: "La page mensuelle est hors de la période sélectionnée.", path: ["monthlyPage"] });

impactRoutes.get("/impact", async (req, res, next) => {
  try {
    const period = periodSchema.parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    res.json(await getImpactReport(restaurantId, period.from, period.to, undefined,
      { includeMonthly: period.monthly === "true", monthlyPage: period.monthlyPage }));
  } catch (error) { next(error); }
});
