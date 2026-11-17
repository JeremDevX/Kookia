import { Router } from "express";
import { z } from "zod";
import { impactMonthPageCount } from "../application/workspace/impactMonthPolicy.js";
import { getImpactMonthlyPage, getImpactReport } from "../application/workspace/impactService.js";
import { workspaceContext } from "./workspaceContext.js";

export const impactRoutes = Router();
const datesSchema = z.object({ from: z.iso.date(), to: z.iso.date() }).strict()
  .refine((period) => period.from <= period.to, { message: "La date de début doit précéder la date de fin." });
const periodSchema = datesSchema.safeExtend({ monthly: z.enum(["true"]).optional(), monthlyPage: z.coerce.number().int().nonnegative().optional() })
  .refine((period) => period.monthly === "true" || period.monthlyPage === undefined,
    { message: "La page mensuelle doit accompagner une demande de réconciliation mensuelle.", path: ["monthlyPage"] })
  .refine((period) => period.monthly !== "true" || period.from > period.to ||
    (period.monthlyPage ?? 0) < impactMonthPageCount(period.from, period.to),
  { message: "La page mensuelle est hors de la période sélectionnée.", path: ["monthlyPage"] });
const monthlySchema = datesSchema.safeExtend({ page: z.string().regex(/^\d+$/).transform(Number).pipe(z.int().nonnegative()).default(0) })
  .refine(({ from, to, page }) => from > to || page < impactMonthPageCount(from, to),
    { message: "La page mensuelle est hors de la période sélectionnée.", path: ["page"] });

impactRoutes.get("/impact", async (req, res) => {
  const period = periodSchema.parse(req.query);
  const restaurantId = workspaceContext(res).restaurantId;
  res.json(await getImpactReport(restaurantId, period.from, period.to, undefined,
    { includeMonthly: period.monthly === "true", monthlyPage: period.monthlyPage }));
});

impactRoutes.get("/impact/monthly", async (req, res) => {
  const { from, to, page } = monthlySchema.parse(req.query);
  const restaurantId = workspaceContext(res).restaurantId;
  res.json(await getImpactMonthlyPage(restaurantId, from, to, page));
});
