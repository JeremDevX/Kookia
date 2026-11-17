import type { Request, Response } from "express";

export interface WorkspaceContext { restaurantId: string; actorId: string; }

export const workspaceContext = (res: Response): WorkspaceContext => res.locals.workspace as WorkspaceContext;

export function rejectChangedWorkspace(req: Request, res: Response): boolean {
  const expected = req.get("X-Expected-Restaurant-Id");
  if (!expected || expected === workspaceContext(res).restaurantId) return false;
  res.status(409).json({ error: { code: "WORKSPACE_CHANGED",
    message: "Votre établissement a changé. Rechargez la page avant de continuer." } });
  return true;
}
