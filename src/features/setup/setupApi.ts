import { apiRequest, ApiError } from "../../config/api";
import type { Restaurant } from "../../services/restaurantService";

export type SetupStep = "team" | "suppliers" | "review";
export type WorkspaceRole = "owner" | "chef" | "kitchen";
export interface WorkspaceCapabilities { viewStock: boolean; countStock: boolean; receiveOrders: boolean; validateOrders: boolean; manageSettings: boolean; }
export interface SetupProgress { configured: boolean; step: SetupStep | null; revision: number; role: WorkspaceRole | null; restaurantName: string | null; capabilities: WorkspaceCapabilities | null; }

export async function checkSetup(expectedUserId: string, refreshUser: () => Promise<void>): Promise<SetupProgress> {
  try {
    const result = await apiRequest<unknown>("/setup");
    if (!result || typeof result !== "object" || !("configured" in result) || typeof result.configured !== "boolean" || !("userId" in result) || typeof result.userId !== "string" || !result.userId) {
      throw new Error("Impossible de vérifier votre établissement.");
    }
    if (!("step" in result) || (result.step !== null && result.step !== "team" && result.step !== "suppliers" && result.step !== "review") || !("revision" in result) || typeof result.revision !== "number" || !Number.isSafeInteger(result.revision) || result.revision < 0 || (!result.configured && result.step !== null)) {
      throw new Error("Impossible de vérifier votre établissement.");
    }
    if (!("role" in result) || (result.role !== null && result.role !== "owner" && result.role !== "chef" && result.role !== "kitchen") || !("restaurantName" in result) || (result.restaurantName !== null && typeof result.restaurantName !== "string") || !("capabilities" in result)) throw new Error("Impossible de vérifier votre établissement.");
    const capabilities = result.capabilities;
    if (result.configured) {
      if (!result.role || !result.restaurantName || !capabilities || typeof capabilities !== "object" || !("viewStock" in capabilities) || typeof capabilities.viewStock !== "boolean" || !("countStock" in capabilities) || typeof capabilities.countStock !== "boolean" || !("receiveOrders" in capabilities) || typeof capabilities.receiveOrders !== "boolean" || !("validateOrders" in capabilities) || typeof capabilities.validateOrders !== "boolean" || !("manageSettings" in capabilities) || typeof capabilities.manageSettings !== "boolean" || (result.role !== "owner" && result.step !== null)) throw new Error("Impossible de vérifier votre établissement.");
    } else if (result.role !== null || result.restaurantName !== null || capabilities !== null) throw new Error("Impossible de vérifier votre établissement.");
    if (result.userId !== expectedUserId) {
      await refreshUser();
      throw new Error("La session a changé. Réessayez.");
    }
    return { configured: result.configured, step: result.step, revision: result.revision, role: result.role, restaurantName: result.restaurantName, capabilities: capabilities as WorkspaceCapabilities | null };
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
    if (!(error instanceof ApiError) || error.status !== 409 || error.details.code !== "SETUP_ALREADY_COMPLETED" && error.details.code !== "ALREADY_MEMBER") throw error;
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
