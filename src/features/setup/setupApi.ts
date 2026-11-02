import { apiRequest, ApiError } from "../../config/api";
import type { Restaurant } from "../../services/restaurantService";

export type SetupStep = "team" | "suppliers" | "review";
export interface SetupProgress { configured: boolean; step: SetupStep | null; revision: number; }

export async function checkSetup(expectedUserId: string, refreshUser: () => Promise<void>): Promise<SetupProgress> {
  try {
    const result = await apiRequest<unknown>("/setup");
    if (!result || typeof result !== "object" || !("configured" in result) || typeof result.configured !== "boolean" || !("userId" in result) || typeof result.userId !== "string" || !result.userId) {
      throw new Error("Impossible de vérifier votre établissement.");
    }
    if (!("step" in result) || (result.step !== null && result.step !== "team" && result.step !== "suppliers" && result.step !== "review") || !("revision" in result) || typeof result.revision !== "number" || !Number.isSafeInteger(result.revision) || result.revision < 0 || (!result.configured && result.step !== null)) {
      throw new Error("Impossible de vérifier votre établissement.");
    }
    if (result.userId !== expectedUserId) {
      await refreshUser();
      throw new Error("La session a changé. Réessayez.");
    }
    return { configured: result.configured, step: result.step, revision: result.revision };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) await refreshUser();
    throw error;
  }
}

export async function createSetup(body: Restaurant, expectedUserId: string, refreshUser: () => Promise<void>) {
  try {
    await apiRequest("/setup", { method: "POST", body: JSON.stringify({ ...body, expectedUserId }) });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || (error.status === 409 && error.details.code === "SESSION_CHANGED"))) await refreshUser();
    if (!(error instanceof ApiError) || error.status !== 409 || error.details.code !== "SETUP_ALREADY_COMPLETED") throw error;
    const result = await checkSetup(expectedUserId, refreshUser);
    if (!result.configured) throw error;
  }
}

export async function changeSetupStep(expectedUserId: string, expectedStep: SetupStep, nextStep: SetupStep | null, expectedRevision: number, refreshUser: () => Promise<void>) {
  try {
    await apiRequest("/setup/step", { method: "PATCH", body: JSON.stringify({ expectedUserId, expectedStep, nextStep, expectedRevision }) });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || (error.status === 409 && error.details.code === "SESSION_CHANGED"))) await refreshUser();
    throw error;
  }
  return checkSetup(expectedUserId, refreshUser);
}
