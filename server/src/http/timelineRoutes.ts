import { Router, type Response } from "express";
import { formatParisDate } from "../../../shared/parisDate.js";
import { z } from "zod";
import { listTimeline } from "../application/workspace/timelineService.js";

export const timelineRoutes = Router();
const workspace = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;

const cursorSchema = z.base64url().max(1024).transform((value, ctx): unknown => {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    ctx.addIssue({ code: "custom", message: "Impossible de reprendre la lecture de l’historique." });
    return z.NEVER;
  }
}).pipe(z.object({
  at: z.string().regex(/^(~|\d{4}-\d{2}-\d{2}(T\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)?)$/),
  id: z.string().min(1).max(500),
}).strict());

const querySchema = z.object({ from: z.iso.date(), to: z.iso.date(), asOf: z.iso.date(),
  q: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: cursorSchema.optional(),
}).strict()
  .refine(({ from, to }) => from <= to,
    { message: "La période doit être croissante." })
  .refine(({ from, to, asOf }) => {
    const today = formatParisDate();
    return from <= today && to <= today && asOf <= today;
  },
    { message: "La chronologie ne peut pas inclure de date future." });

timelineRoutes.get("/timeline", async (req, res) => {
  const { from, to, asOf, ...page } = querySchema.parse(req.query);
  const paginated = page.cursor !== undefined || page.q !== undefined || page.limit !== undefined;
  res.json(await listTimeline(workspace(res), from, to, asOf, paginated ? page : undefined));
});
