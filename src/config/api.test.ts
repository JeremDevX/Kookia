import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";

describe("apiRequest", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the local API prefix and includes cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    await apiRequest<{ status: string }>("/health");
    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.objectContaining({ credentials: "include" }));
  });

  it("turns structured API failures into ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalides", fields: { email: "Invalide" } } }), { status: 400 }));
    await expect(apiRequest("/auth/register", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 400, details: { code: "VALIDATION_ERROR" } });
  });

  it("handles empty 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest<void>("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});
