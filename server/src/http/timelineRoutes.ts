import { Router, type Response } from "express";
import { z } from "zod";
import { listTimeline } from "../application/workspace/timelineService.js";

export const timelineRoutes = Router();
const workspace = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const querySchema = z.object({ from: z.iso.date(), to: z.iso.date(), asOf: z.iso.date() }).strict()
  .refine(({ from, to }) => from <= to,
    { message: "La période doit être croissante." })
  .refine(({ from, to, asOf }) => from <= today() && to <= today() && asOf <= today(),
    { message: "La chronologie ne peut pas inclure de date future." });

timelineRoutes.get("/timeline", async (req, res, next) => {
  try {
    const { from, to, asOf } = querySchema.parse(req.query);
    res.json(await listTimeline(workspace(res), from, to, asOf));
  } catch (error) { next(error); }
});
