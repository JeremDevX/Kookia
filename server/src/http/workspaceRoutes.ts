import { invitationOwnerRoutes, membershipOwnerRoutes } from "./invitationRoutes.js";
import { reportRoutes } from "./reportRoutes.js";
import { impactRoutes } from "./impactRoutes.js";
import { ingredientOutflowEstimateRoutes } from "./ingredientOutflowEstimateRoutes.js";
import { salesRoutes } from "./salesRoutes.js";
import { inventoryRoutes } from "./inventoryRoutes.js";
import { serviceCalendarRoutes } from "./serviceCalendarRoutes.js";
import { serviceOperationsRoutes } from "./serviceOperationsRoutes.js";
import { serviceSheetRoutes } from "./serviceSheetRoutes.js";
import { operationalIncidentRoutes } from "./operationalIncidentRoutes.js";
import { menuRoutes } from "./menuRoutes.js";
import { restaurantRoutes } from "./restaurantRoutes.js";
import { invoiceRoutes } from "./invoiceRoutes.js";
import { notificationRoutes } from "./notificationRoutes.js";
import { cartRoutes } from "./cartRoutes.js";
import { orderRoutes } from "./orderRoutes.js";
import { preferencesRoutes } from "./preferencesRoutes.js";
import { workspaceReadRoutes } from "./workspaceReadRoutes.js";
import { timelineRoutes } from "./timelineRoutes.js";
import { sourceRoutes } from "./sourceRoutes.js";
import { weatherRoutes } from "./weatherRoutes.js";
import { catalogRoutes } from "./catalogRoutes.js";
import { recipeRoutes } from "./recipeRoutes.js";
import { Router } from "express";
import { z } from "zod";
import { sessionCookieName } from "../config/env.js";
import { getUserBySessionToken } from "../application/auth/authService.js";
import { WorkspaceError } from "../application/workspace/catalogService.js";
import { resolveWorkspace } from "../application/workspace/workspaceIdentity.js";
import { canAccessWorkspace } from "../application/workspace/workspacePermissions.js";

export const workspaceRoutes = Router();
workspaceRoutes.use(async (req, res, next) => {
  const user = await getUserBySessionToken(req.cookies[sessionCookieName]);
  if (req.get("X-Expected-User-Id") !== user.id) { res.status(409).json({ error: { code: "SESSION_CHANGED", message: "Votre session a changé. Rechargez la page avant de continuer." } }); return; }
  const workspace = await resolveWorkspace(user.id);
  if (!workspace) { res.status(409).json({ error: { code: "SETUP_REQUIRED", message: "Créez votre établissement pour accéder à votre espace." } }); return; }
  if (!canAccessWorkspace(workspace.role, req.method, `${req.baseUrl}${req.path}`)) { res.status(403).json({ error: { code: "FORBIDDEN", message: "Vous ne pouvez pas effectuer cette action." } }); return; }
  res.locals.workspace = { restaurantId: workspace.restaurantId, actorId: user.id };
  next();
});

workspaceRoutes.use("/invitations", invitationOwnerRoutes);
workspaceRoutes.use("/members", membershipOwnerRoutes);
workspaceRoutes.use(workspaceReadRoutes);
workspaceRoutes.use(timelineRoutes);
workspaceRoutes.use(sourceRoutes);
workspaceRoutes.use(weatherRoutes);
workspaceRoutes.use(preferencesRoutes);
workspaceRoutes.use(orderRoutes);
workspaceRoutes.use(cartRoutes);
workspaceRoutes.use(notificationRoutes);
workspaceRoutes.use(invoiceRoutes);
workspaceRoutes.use(restaurantRoutes);
workspaceRoutes.use(menuRoutes);
workspaceRoutes.use(reportRoutes);
workspaceRoutes.use(impactRoutes);
workspaceRoutes.use(ingredientOutflowEstimateRoutes);
workspaceRoutes.use(salesRoutes);
workspaceRoutes.use(inventoryRoutes);
workspaceRoutes.use(serviceCalendarRoutes);
workspaceRoutes.use(serviceOperationsRoutes);
workspaceRoutes.use(serviceSheetRoutes);
workspaceRoutes.use(operationalIncidentRoutes);

workspaceRoutes.use(catalogRoutes);
workspaceRoutes.use(recipeRoutes);

workspaceRoutes.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (error instanceof z.ZodError) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données fournies sont invalides." } }); return; }
  if (error instanceof WorkspaceError) { res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.duplicates ? { duplicates: error.duplicates } : {}) } }); return; }
  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Le contenu dépasse la taille autorisée." } }); return;
  }
  next(error);
});
