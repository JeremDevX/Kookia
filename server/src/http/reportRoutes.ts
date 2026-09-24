import { Router } from "express";
import { z } from "zod";
import { getOperationalReport } from "../application/workspace/reportService.js";

export const reportRoutes = Router();
reportRoutes.get("/report", async (req, res, next) => {
  try {
    const { from, to } = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine((range) => range.from <= range.to).parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    res.json(await getOperationalReport(restaurantId, from, to));
  } catch (error) { next(error); }
});
