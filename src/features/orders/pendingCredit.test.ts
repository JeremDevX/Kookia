import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "../../config/api";
import { readPendingCredit, submitPendingCredit } from "./pendingCredit";

const input = { operationId: "00000000-0000-4000-8000-000000000001", receiptId: "00000000-0000-4000-8000-000000000002", reference: "AV-1", amount: 3.25, reason: "Retour" };
const other = { ...input, operationId: "00000000-0000-4000-8000-000000000003", reference: "AV-2" };
let stored: Map<string, string>;
let locks: Map<string, Promise<unknown>>;
const read = (user = "u", restaurant = "r", order = "o") => readPendingCredit(user, restaurant, order);
const submit = (value = input, resume = false, send = vi.fn().mockResolvedValue(undefined)) =>
  submitPendingCredit("u", "r", "o", value, resume, () => {}, send);

beforeEach(() => {
  stored = new Map(); locks = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.stubGlobal("navigator", { locks: { request: (key: string, callback: () => Promise<void>) => {
    const task = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(callback);
    locks.set(key, task); return task;
  } } });
});

it("persiste avant envoi et reprend à l’identique après perte de réponse et rechargement", async () => {
  await expect(submit(input, false, vi.fn().mockImplementation(() => {
    expect(read()).toEqual(input); throw new Error("réponse perdue");
  }))).rejects.toThrow();
  const restored = read()!;
  const replay = vi.fn().mockResolvedValue(undefined);
  await submit(restored, true, replay);
  expect(replay).toHaveBeenCalledOnce(); expect(read()).toBeNull();
});

it("isole compte, établissement et commande et refuse une autre intention", async () => {
  await expect(submit(input, false, vi.fn().mockRejectedValue(new Error("perdu")))).rejects.toThrow();
  expect(read("autre")).toBeNull(); expect(read("u", "autre")).toBeNull(); expect(read("u", "r", "autre")).toBeNull();
  const send = vi.fn();
  await expect(submit(other, false, send)).rejects.toThrow("autre avoir");
  expect(send).not.toHaveBeenCalled(); expect(read()).toEqual(input);
});

it("sérialise deux onglets et ne recrée pas une reprise déjà résolue", async () => {
  await expect(submit(input, false, vi.fn().mockRejectedValue(new Error("perdu")))).rejects.toThrow();
  let release!: () => void;
  const firstSend = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
  const secondSend = vi.fn();
  const first = submit(input, true, firstSend);
  await vi.waitFor(() => expect(firstSend).toHaveBeenCalledOnce());
  const second = submit(input, true, secondSend);
  release(); await first;
  await expect(second).rejects.toThrow("déjà été vérifié");
  expect(secondSend).not.toHaveBeenCalled(); expect(read()).toBeNull();
});

it("garde une reprise incertaine même après un refus et libère un refus initial certain", async () => {
  await expect(submit(input, false, vi.fn().mockRejectedValue(new Error("perdu")))).rejects.toThrow();
  await expect(submit(input, true, vi.fn().mockRejectedValue(new ApiError(400, { code: "VALIDATION_ERROR", message: "refus" })))).rejects.toThrow();
  expect(read()).toEqual(input);
  stored.clear();
  await expect(submit(input, false, vi.fn().mockRejectedValue(new ApiError(400, { code: "VALIDATION_ERROR", message: "refus" })))).rejects.toThrow();
  expect(read()).toBeNull();
});

it("bloque si le stockage est illisible, indisponible ou si le verrou manque", async () => {
  const send = vi.fn(); stored.set("purchase-credit:u:r:o", "{invalid");
  await expect(submit(input, false, send)).rejects.toThrow("illisible");
  stored.clear(); vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("stockage indisponible"); } });
  await expect(submit(input, false, send)).rejects.toThrow("stockage indisponible");
  vi.stubGlobal("navigator", {});
  await expect(submit(input, false, send)).rejects.toThrow("navigateur compatible");
  expect(send).not.toHaveBeenCalled();
});

it.each([{ ...input, reference: "   " }, { ...input, reason: "   " }, { ...input, amount: Number.NaN }])(
  "refuse les données illisibles avant leur sauvegarde ou leur envoi", async (invalid) => {
    const send = vi.fn();
    await expect(submit(invalid, false, send)).rejects.toThrow("Vérifiez");
    expect(read()).toBeNull(); expect(send).not.toHaveBeenCalled();
  });

it("libère une reprise quand un autre utilisateur a déjà enregistré cet avoir", async () => {
  await expect(submit(input, false, vi.fn().mockRejectedValue(new Error("perdu")))).rejects.toThrow();
  await expect(submit(input, true, vi.fn().mockRejectedValue(new ApiError(409, {
    code: "CREDIT_ALREADY_RECORDED", message: "Cet avoir est déjà lié à cette réception.",
  })))).rejects.toThrow();
  expect(read()).toBeNull();
});
