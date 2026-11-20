import { z } from "zod";
import { ApiError, apiRequest, bindDocumentUser } from "../../src/config/api";
import { workshopControlSchema, workshopDayDetailsSchema, workshopSettingsSchema } from "../../shared/workshopControl";

const workspacePath = "/workspace/workshop";
const sessionSchema = z.object({ user: z.object({ id: z.string().min(1) }) });

export async function loadWorkshop(signal: AbortSignal) {
  const session = sessionSchema.parse(await apiRequest<unknown>("/auth/me", { signal }));
  signal.throwIfAborted();
  if (!bindDocumentUser(session.user.id)) throw new ApiError(409, {
    code: "SESSION_CHANGED", message: "Votre session a changé. Rechargez la page avant de continuer.",
  });
  return workshopControlSchema.parse(await apiRequest<unknown>(workspacePath, { signal }));
}

export async function loadWorkshopDay(date: string, signal: AbortSignal) {
  return workshopDayDetailsSchema.parse(await apiRequest<unknown>(`${workspacePath}/days/${date}`, { signal }));
}

export async function saveWorkshopSettings(settings: { covers: number; incidentEvery: number; expectedRevision: number }) {
  const payload = await apiRequest<unknown>(`${workspacePath}/settings`, { method: "PUT", body: JSON.stringify(settings) });
  return workshopSettingsSchema.parse(payload);
}

export async function requestWorkshopRetry() {
  z.object({ queued: z.literal(true) }).parse(await apiRequest<unknown>(`${workspacePath}/retry`, { method: "POST", body: "{}" }));
}

export function workshopAccessError(error: unknown) {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) return "signin";
  if (error.details.code === "SESSION_CHANGED") return "reload";
  if (error.status === 403 || error.status === 404) return "unavailable";
  return null;
}
