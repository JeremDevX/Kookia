import { Router, type Response } from "express";
import { z } from "zod";
import { workshopSettingsInputSchema } from "../../../shared/workshopControl.js";
import { getWorkshopControl, queueWorkshopRetry, readWorkshopControlRestaurant, saveWorkshopSettings,
  type WorkshopControlScope } from "../application/workspace/workshopControlService.js";
import { getWorkshopDayDetails } from "../application/workspace/workshopDayDetails.js";
import { WorkspaceError } from "../application/workspace/workspaceError.js";
import { rejectChangedWorkspace, workspaceContext } from "./workspaceContext.js";

export const workshopControlRoutes = Router();
const dateSchema = z.iso.date().refine(date => date >= "0001-01-01");
const emptyBody = z.strictObject({});

function scopeFor(res: Response): WorkshopControlScope {
  const scope = res.locals.workshopControlScope as WorkshopControlScope | undefined;
  if (!scope || scope.restaurantId !== workspaceContext(res).restaurantId) {
    throw new WorkspaceError(404, "WORKSHOP_NOT_CONFIGURED", "L’atelier n’est pas configuré pour cet établissement.");
  }
  return scope;
}

workshopControlRoutes.use((req, res, next) => {
  if (rejectChangedWorkspace(req, res)) return;
  res.set("Cache-Control", "private, no-store");
  next();
});

workshopControlRoutes.get("/", async (_req, res) => {
  res.json(await getWorkshopControl(scopeFor(res), res.locals.canManageWorkshop === true));
});

workshopControlRoutes.get("/days/:date", async (req, res) => {
  const scope = scopeFor(res);
  const date = dateSchema.parse(req.params.date);
  await readWorkshopControlRestaurant(scope);
  res.json(await getWorkshopDayDetails(scope.restaurantId, date));
});

workshopControlRoutes.put("/settings", async (req, res) => {
  const scope = scopeFor(res);
  res.json(await saveWorkshopSettings(scope, workshopSettingsInputSchema.parse(req.body)));
});

workshopControlRoutes.post("/retry", async (req, res) => {
  const scope = scopeFor(res);
  emptyBody.parse(req.body);
  res.status(202).json(await queueWorkshopRetry(scope));
});
