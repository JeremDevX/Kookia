import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, bindDocumentUser } from "./api";

describe("apiRequest", () => {
  afterEach(() => vi.restoreAllMocks());

  it("blocks workspace requests until the document has an authenticated account", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(apiRequest("/workspace/sales")).rejects.toThrow("Connectez-vous");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows idempotent logout without a session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has("X-Expected-User-Id")).toBe(false);
  });

  it.each(["/account/profile", "/account/change-email", "/account/change-password", "/account"])("blocks %s mutation without a session", async (path) => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(apiRequest(path, { method: "POST" })).rejects.toThrow("Connectez-vous");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps delayed workspace requests tied to the first account", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(bindDocumentUser("account-a")).toBe(true);
    let resume!: () => void;
    const delay = new Promise<void>((resolve) => { resume = resolve; });
    const delayed = delay.then(() => apiRequest("/workspace/sales", { headers: { "X-Expected-User-Id": "account-b" } }));
    expect(bindDocumentUser("account-b")).toBe(false);
    resume();
    await delayed;
    const options = fetchMock.mock.calls[0][1];
    expect(new Headers(options?.headers).get("X-Expected-User-Id")).toBe("account-a");
    expect(bindDocumentUser("account-a")).toBe(true);
  });

  it.each(["/account/profile", "/account/change-email", "/account/change-password", "/account", "/auth/logout"])("ties %s mutation to the document account", async (path) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await apiRequest(path, { method: "POST", headers: { "X-Expected-User-Id": "account-b" } });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("X-Expected-User-Id")).toBe("account-a");
  });

  it("uses the local API prefix and includes cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    await apiRequest<{ status: string }>("/health");
    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.objectContaining({ credentials: "include" }));
  });

  it("turns structured API failures into ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalides", fields: { email: "Invalide" } } }), { status: 400 }));
    await expect(apiRequest("/auth/register", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 400, details: { code: "VALIDATION_ERROR" } });
  });

  it("turns fetch network failures into a recoverable French message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiRequest("/workspace/sales")).rejects.toThrow("Connexion au serveur indisponible. Vérifiez votre connexion puis réessayez.");
  });

  it("handles empty 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest<void>("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});
