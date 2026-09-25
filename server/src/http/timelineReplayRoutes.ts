import { Router, type Response } from "express";
import { z } from "zod";
import { createTimelineReplay, getTimelineReplay } from "../application/workspace/timelineReplayService.js";

export const timelineReplayRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string };
const createSchema = z.object({ decisionId: z.uuid() }).strict();

timelineReplayRoutes.post("/timeline/replays", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    res.status(201).json(await createTimelineReplay(context(res).restaurantId, input.decisionId));
  } catch (error) { next(error); }
});

timelineReplayRoutes.get("/timeline/replays/:id", async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    res.json(await getTimelineReplay(context(res).restaurantId, id));
  } catch (error) { next(error); }
});
