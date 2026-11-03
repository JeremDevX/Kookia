import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../config/api";
import { readPendingAdjustment, submitAdjustment } from "./pendingAdjustment";

const input = { operationId: "00000000-0000-4000-8000-000000000001", delta: -2, reason: "loss" as const, expectedStockRevision: 1, expectedUnit: "kg" as const };
const other = { ...input, operationId: "00000000-0000-4000-8000-000000000002", delta: -3 };
let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.stubGlobal("navigator", { locks: { request: (_key: string, callback: () => Promise<void>) => callback() } });
});
describe("ajustement en attente", () => {
  it("conserve l’opération après réponse perdue et la rejoue à l’identique", async () => {
    const lost = vi.fn().mockRejectedValue(new Error("réponse perdue"));
    await expect(submitAdjustment("u", "r", "p", input, false, lost)).rejects.toThrow();
    expect(readPendingAdjustment("u", "r", "p")).toEqual(input);
    const replay = vi.fn().mockResolvedValue(undefined);
    await submitAdjustment("u", "r", "p", readPendingAdjustment("u", "r", "p")!, true, replay);
    expect(replay).toHaveBeenCalledOnce();
    expect(readPendingAdjustment("u", "r", "p")).toBeNull();
  });
  it("refuse une intention différente et isole compte et établissement", async () => {
    await expect(submitAdjustment("u", "r", "p", input, false, () => Promise.reject(new Error()))).rejects.toThrow();
    const send = vi.fn();
    await expect(submitAdjustment("u", "r", "p", other, false, send)).rejects.toThrow();
    await expect(submitAdjustment("u", "r", "p", { ...input, delta: -3 }, false, send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(readPendingAdjustment("autre", "r", "p")).toBeNull();
    expect(readPendingAdjustment("u", "autre", "p")).toBeNull();
  });
  it("ne recrée jamais une reprise déjà résolue dans un autre onglet", async () => {
    const send = vi.fn();
    await expect(submitAdjustment("u", "r", "p", input, true, send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(readPendingAdjustment("u", "r", "p")).toBeNull();
  });
  it.each([[400, "VALIDATION_ERROR"], [409, "STOCK_CHANGED"], [409, "INSUFFICIENT_STOCK"]])("libère après refus certain %s %s", async (status, code) => {
    await expect(submitAdjustment("u", "r", "p", input, false, () => Promise.reject(new ApiError(status, { code, message: code })))).rejects.toThrow();
    expect(readPendingAdjustment("u", "r", "p")).toBeNull();
  });
  it("conserve une opération en cas d’accès refusé après un résultat incertain", async () => {
    await expect(submitAdjustment("u", "r", "p", input, false, () => Promise.reject(new ApiError(403, { code: "FORBIDDEN", message: "Accès refusé" })))).rejects.toThrow();
    expect(readPendingAdjustment("u", "r", "p")).toEqual(input);
  });
  it("bloque l’envoi si le stockage ou le verrou est indisponible", async () => {
    const send = vi.fn();
    vi.stubGlobal("navigator", {});
    await expect(submitAdjustment("u", "r", "p", input, false, send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
