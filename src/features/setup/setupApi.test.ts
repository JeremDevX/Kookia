import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../config/api";
import { checkSetup, createSetup } from "./setupApi";

vi.mock("../../config/api", async (original) => ({
  ...await original<typeof import("../../config/api")>(),
  apiRequest: vi.fn(),
}));
import { apiRequest } from "../../config/api";
const request = vi.mocked(apiRequest);
const restaurant = { name: "Restaurant", type: "Bistrot", address: "", city: "Lyon", phone: "", email: "contact@example.test", dailyCovers: 35, hasTerrace: null };
const failure = (status: number, code = "ERROR") => new ApiError(status, { code, message: "Erreur" });
afterEach(() => vi.resetAllMocks());

describe("setup API", () => {
  it("recovers a completed setup after a conflict", async () => {
    request.mockRejectedValueOnce(failure(409, "SETUP_ALREADY_COMPLETED")).mockResolvedValueOnce({ configured: true, userId: "account-id" });
    await expect(createSetup(restaurant, "account-id", vi.fn())).resolves.toBeUndefined();
    expect(request).toHaveBeenLastCalledWith("/setup");
  });
  it("sends the expected account with the restaurant", async () => {
    request.mockResolvedValueOnce(undefined);
    await createSetup(restaurant, "account-id", vi.fn());
    expect(request).toHaveBeenCalledWith("/setup", { method: "POST", body: JSON.stringify({ ...restaurant, expectedUserId: "account-id" }) });
  });
  it("refreshes a changed session without treating it as a completed setup", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const error = failure(409, "SESSION_CHANGED");
    request.mockRejectedValueOnce(error);
    await expect(createSetup(restaurant, "account-id", refresh)).rejects.toBe(error);
    expect(refresh).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("keeps the conflict visible if setup is not configured", async () => {
    const error = failure(409, "SETUP_ALREADY_COMPLETED");
    request.mockRejectedValueOnce(error).mockResolvedValueOnce({ configured: false, userId: "account-id" });
    await expect(createSetup(restaurant, "account-id", vi.fn())).rejects.toBe(error);
  });
  it.each(["POST", "relecture après conflit"])("refreshes an expired session during %s", async (step) => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const expired = failure(401);
    if (step !== "POST") request.mockRejectedValueOnce(failure(409, "SETUP_ALREADY_COMPLETED"));
    request.mockRejectedValueOnce(expired);
    await expect(createSetup(restaurant, "account-id", refresh)).rejects.toBe(expired);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("does not refresh the session for other creation errors", async () => {
    const refresh = vi.fn();
    for (const error of [failure(500), new TypeError("réseau")]) {
      request.mockRejectedValueOnce(error);
      await expect(createSetup(restaurant, "account-id", refresh)).rejects.toBe(error);
    }
    expect(refresh).not.toHaveBeenCalled();
  });
  it("rejects malformed setup status instead of redirecting", async () => {
    const refresh = vi.fn();
    for (const response of [null, {}, { configured: "false", userId: "account-id" }, { configured: 1, userId: "account-id" }, { configured: true }, { configured: true, userId: "" }, { configured: true, userId: 123 }]) {
      request.mockResolvedValueOnce(response);
      await expect(checkSetup("account-id", refresh)).rejects.toThrow("Impossible de vérifier votre établissement.");
    }
    expect(refresh).not.toHaveBeenCalled();
  });
  it.each([true, false])("rejects setup status for another account (configured=%s)", async (configured) => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    request.mockResolvedValueOnce({ configured, userId: "other-account" });
    await expect(checkSetup("account-id", refresh)).rejects.toThrow("La session a changé");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("does not recover a conflict using another account's status", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    request.mockRejectedValueOnce(failure(409, "SETUP_ALREADY_COMPLETED"));
    request.mockResolvedValueOnce({ configured: true, userId: "other-account" });
    await expect(createSetup(restaurant, "account-id", refresh)).rejects.toThrow("La session a changé");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("refreshes only an expired session", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const expired = failure(401);
    request.mockRejectedValueOnce(expired);
    await expect(checkSetup("account-id", refresh)).rejects.toBe(expired);
    expect(refresh).toHaveBeenCalledOnce();
    refresh.mockClear();
    for (const error of [failure(500), new TypeError("réseau")]) {
      request.mockRejectedValueOnce(error);
      await expect(checkSetup("account-id", refresh)).rejects.toBe(error);
    }
    expect(refresh).not.toHaveBeenCalled();
  });
});
