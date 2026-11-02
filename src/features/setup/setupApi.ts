import { apiRequest, ApiError } from "../../config/api";
import type { Restaurant } from "../../services/restaurantService";

export async function checkSetup(expectedUserId: string, refreshUser: () => Promise<void>) {
  try {
    const result = await apiRequest<unknown>("/setup");
    if (!result || typeof result !== "object" || !("configured" in result) || typeof result.configured !== "boolean" || !("userId" in result) || typeof result.userId !== "string" || !result.userId) {
      throw new Error("Impossible de vérifier votre établissement.");
    }
    if (result.userId !== expectedUserId) {
      await refreshUser();
      throw new Error("La session a changé. Réessayez.");
    }
    return { configured: result.configured };
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
