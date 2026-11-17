import type { Response } from "express";

interface WorkspaceContext { restaurantId: string; actorId: string; }

export const workspaceContext = (res: Response): WorkspaceContext => res.locals.workspace as WorkspaceContext;
