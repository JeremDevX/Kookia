import { Router, type Response } from "express";
import { z } from "zod";
import { incidentInputSchema } from "../../../shared/serviceOperations.js";
import { listOperationalIncidents, recordOperationalIncident, resolveOperationalIncident } from "../application/workspace/operationalIncidentService.js";

export const operationalIncidentRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
operationalIncidentRoutes.get("/service-incidents", async (req, res, next) => {
  try {
    const input = z.object({ from: z.iso.date(), to: z.iso.date() }).refine(v => v.from <= v.to && Date.parse(v.to) - Date.parse(v.from) <= 90 * 86400000).parse(req.query);
    res.json(await listOperationalIncidents(context(res).restaurantId, input.from, input.to));
  } catch (error) { next(error); }
});
operationalIncidentRoutes.post("/service-incidents", async (req, res, next) => {
  try { const { restaurantId, actorId } = context(res); res.status(201).json(await recordOperationalIncident(restaurantId, actorId, incidentInputSchema.parse(req.body))); }
  catch (error) { next(error); }
});
operationalIncidentRoutes.post("/service-incidents/:id/resolve", async (req, res, next) => {
  try {
    const input = z.object({ operationId: z.uuid(), expectedRevision: z.number().int().positive(), actionNote: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.json(await resolveOperationalIncident(restaurantId, actorId, z.uuid().parse(req.params.id), input));
  } catch (error) { next(error); }
});
