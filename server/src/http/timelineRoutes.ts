import { Router, type Response } from "express";
import { formatParisDate } from "../../../shared/parisDate.js";
import { z } from "zod";
import { listTimeline } from "../application/workspace/timelineService.js";

export const timelineRoutes = Router();
const workspace = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;

const querySchema = z.object({ from: z.iso.date(), to: z.iso.date(), asOf: z.iso.date() }).strict()
  .refine(({ from, to }) => from <= to,
    { message: "La période doit être croissante." })
  .refine(({ from, to, asOf }) => {
    const today = formatParisDate();
    return from <= today && to <= today && asOf <= today;
  },
    { message: "La chronologie ne peut pas inclure de date future." });

timelineRoutes.get("/timeline", async (req, res) => {
  const { from, to, asOf } = querySchema.parse(req.query);
  res.json(await listTimeline(workspace(res), from, to, asOf));
});
