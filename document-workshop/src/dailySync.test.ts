import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recipeById } from "./catalog";
import { parseCheckpointFile } from "./continuation";
import { readDailySyncConfig, syncDaily } from "./dailySync";
import { defaultScenarioOptions, generateScenario } from "./scenario";

const throughTuesday = new Date("2026-09-08T22:30:00Z");
const startDate = "2026-09-07";
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "kookia-workshop-test-"));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

const fixtureEnv = () => ({
  WORKSHOP_API_ORIGIN: "https://kookia.example",
  WORKSHOP_IMPORT_TOKEN: "example-test-token-for-kookia-workshop",
  WORKSHOP_STATE_FILE: join(directory, "checkpoint.json"),
  WORKSHOP_START_DATE: startDate,
});
const dayFromRequest = (input: URL | RequestInfo) => String(input).split("/").at(-1);

describe("daily workshop sync", () => {
  it("sends closed and open days in order through the last Paris day, preserving continuation", async () => {
    const env = fixtureEnv();
    const config = readDailySyncConfig(env);
    const send = vi.fn<typeof fetch>(async (input) => Response.json({ date: dayFromRequest(input), replayed: false }));
    vi.stubGlobal("fetch", send);
    const complete = generateScenario(defaultScenarioOptions(startDate, 2));

    await expect(syncDaily(config, throughTuesday)).resolves.toEqual({ imported: 2, replayed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toEqual(new URL("/api/integrations/workshop/days/2026-09-07", env.WORKSHOP_API_ORIGIN));
    expect(send.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      headers: { authorization: `Bearer ${env.WORKSHOP_IMPORT_TOKEN}` },
      body: JSON.stringify({ open: false, sales: [] }),
      redirect: "error",
    });
    const expectedSales = complete.days[1].services.flatMap(service => service.runs
      .filter(run => run.sold > 0)
      .map(run => ({ name: recipeById(run.recipeId).name, quantity: run.sold })));
    const openDay = JSON.parse(String(send.mock.calls[1][1]?.body));
    expect(openDay).toEqual({ open: true, sales: expect.arrayContaining(expectedSales) });
    expect(openDay.sales).toHaveLength(expectedSales.length);
    expect(parseCheckpointFile(await readFile(config.stateFile, "utf8"))).toEqual({
      ...complete.checkpoint,
      dossier: "2026-09-08-1",
    });

    await expect(syncDaily(config, throughTuesday)).resolves.toEqual({ imported: 0, replayed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("resumes the exact same day after errors or a missing acknowledgment", async () => {
    const config = readDailySyncConfig(fixtureEnv());
    const throughWednesday = new Date("2026-09-10T00:30:00+02:00");
    const send = vi.fn<typeof fetch>(async (input) => Response.json({ date: dayFromRequest(input), replayed: false }));
    send.mockImplementationOnce(async (input) => Response.json({ date: dayFromRequest(input), replayed: false }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ date: startDate, replayed: true }))
      .mockImplementationOnce(async (input) => Response.json({ date: dayFromRequest(input), replayed: true }));
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(config, throughWednesday)).rejects.toThrow("2026-09-08 (HTTP 409)");
    const savedMonday = await readFile(config.stateFile, "utf8");
    expect(parseCheckpointFile(savedMonday).asOf).toBe(startDate);
    await expect(syncDaily(config, throughWednesday)).rejects.toThrow("n’a pas confirmé la réception du 2026-09-08");
    expect(await readFile(config.stateFile, "utf8")).toBe(savedMonday);
    await expect(syncDaily(config, throughWednesday)).resolves.toEqual({ imported: 1, replayed: 1 });
    expect(send.mock.calls.map(([url]) => dayFromRequest(url))).toEqual([
      "2026-09-07", "2026-09-08", "2026-09-08", "2026-09-08", "2026-09-09",
    ]);
    expect(send.mock.calls[3][1]?.body).toBe(send.mock.calls[1][1]?.body);
    expect(parseCheckpointFile(await readFile(config.stateFile, "utf8")).asOf).toBe("2026-09-09");
  });

  it("rejects plaintext remote origins and checks configuration without leaking the token", () => {
    const env = fixtureEnv();
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_API_ORIGIN: "http://kookia.example" })).toThrow("HTTPS");
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_IMPORT_TOKEN: "invalid credential" })).toThrow(
      /^WORKSHOP_IMPORT_TOKEN est manquant ou invalide\.$/,
    );
    expect(readDailySyncConfig({ ...env, WORKSHOP_API_ORIGIN: "http://127.0.0.1:3001" }).timeoutMs).toBe(30_000);
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_VARIATION_FROM: "2026-02-29" })).toThrow(
      "WORKSHOP_VARIATION_FROM doit être une date valide",
    );
  });

  it("stops without sending if the saved checkpoint is invalid or belongs to another start", async () => {
    const config = readDailySyncConfig(fixtureEnv());
    const send = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", send);

    await writeFile(config.stateFile, "interrupted JSON");
    await expect(syncDaily(config, throughTuesday)).rejects.toThrow("JSON illisible");
    const otherScenario = generateScenario(defaultScenarioOptions("2026-09-06", 1));
    const checkpoint = JSON.stringify(otherScenario.checkpoint);
    await writeFile(config.stateFile, checkpoint);
    await expect(syncDaily(config, throughTuesday)).rejects.toThrow("ne correspond pas au dossier planifié");
    expect(send).not.toHaveBeenCalled();
    expect(await readFile(config.stateFile, "utf8")).toBe(checkpoint);
  });

  it("continues an initial checkpoint without sending prior days or modifying the source file", async () => {
    const openingFile = join(directory, "opening.json");
    const initial = generateScenario(defaultScenarioOptions("2026-11-10", 7));
    const source = JSON.stringify(initial.checkpoint);
    await writeFile(openingFile, source);
    const config = readDailySyncConfig({
      ...fixtureEnv(), WORKSHOP_OPENING_CHECKPOINT_FILE: openingFile, WORKSHOP_START_DATE: "2026-11-17",
    });
    const send = vi.fn<typeof fetch>(async (input) => Response.json({ date: dayFromRequest(input), replayed: false }));
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(config, new Date("2026-11-18T00:30:00+01:00"))).resolves.toEqual({ imported: 1, replayed: 0 });
    await expect(syncDaily(config, new Date("2026-11-19T00:30:00+01:00"))).resolves.toEqual({ imported: 1, replayed: 0 });
    expect(send.mock.calls.map(([url]) => dayFromRequest(url))).toEqual(["2026-11-17", "2026-11-18"]);
    expect(parseCheckpointFile(await readFile(config.stateFile, "utf8"))).toEqual({
      ...generateScenario(defaultScenarioOptions("2026-11-10", 9)).checkpoint,
      dossier: "2026-11-18-1",
    });
    expect(await readFile(openingFile, "utf8")).toBe(source);
  });

  it("stops when the configured initial checkpoint is missing or cannot continue on the first date", async () => {
    const env = fixtureEnv();
    const openingFile = join(directory, "opening.json");
    const config = readDailySyncConfig({ ...env, WORKSHOP_OPENING_CHECKPOINT_FILE: openingFile });
    const send = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(config, throughTuesday)).rejects.toThrow("reprise initiale est introuvable");
    const incompatible = generateScenario({ ...defaultScenarioOptions("2026-09-06", 1), seed: 2 });
    await writeFile(openingFile, JSON.stringify(incompatible.checkpoint));
    await expect(syncDaily(config, throughTuesday)).rejects.toThrow("conserver le numéro du dossier");
    const prior = generateScenario(defaultScenarioOptions("2026-09-05", 1));
    await writeFile(openingFile, JSON.stringify(prior.checkpoint));
    await expect(syncDaily(config, throughTuesday)).rejects.toThrow("précéder immédiatement");
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_OPENING_CHECKPOINT_FILE: env.WORKSHOP_STATE_FILE })).toThrow(
      "chemin absolu distinct",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("replays the same sales with stock and advances its own checkpoint only after stock confirmation", async () => {
    const openingFile = join(directory, "opening.json");
    const initial = generateScenario(defaultScenarioOptions("2026-11-10", 7));
    await writeFile(openingFile, JSON.stringify(initial.checkpoint));
    const env = { ...fixtureEnv(), WORKSHOP_OPENING_CHECKPOINT_FILE: openingFile, WORKSHOP_START_DATE: "2026-11-17" };
    const saleOnly = readDailySyncConfig(env);
    const stockSync = readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: join(directory, "stock.json") });
    const date = "2026-11-17";
    const now = new Date("2026-11-18T00:30:00+01:00");
    const send = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ date, replayed: false }))
      .mockResolvedValueOnce(Response.json({ date, replayed: true }))
      .mockResolvedValueOnce(Response.json({ date, replayed: true, stockApplied: true }));
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(saleOnly, now)).resolves.toEqual({ imported: 1, replayed: 0 });
    const original = await readFile(saleOnly.stateFile, "utf8");
    await expect(syncDaily(stockSync, now)).rejects.toThrow("n’a pas confirmé la réception du 2026-11-17");
    await expect(readFile(stockSync.stateFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(syncDaily(stockSync, now)).resolves.toEqual({ imported: 0, replayed: 1 });
    expect(await readFile(stockSync.stateFile, "utf8")).toEqual(original);
    expect(await readFile(saleOnly.stateFile, "utf8")).toEqual(original);
    const { stock, ...salesReplay } = JSON.parse(String(send.mock.calls[2][1]?.body));
    expect(salesReplay).toEqual(JSON.parse(String(send.mock.calls[0][1]?.body)));
    expect(stock).toHaveLength(initial.catalog.ingredients.length);
    expect(send.mock.calls[2][1]?.body).toBe(send.mock.calls[1][1]?.body);
    await expect(syncDaily(stockSync, now)).resolves.toEqual({ imported: 0, replayed: 0 });
    expect(send).toHaveBeenCalledTimes(3);
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: env.WORKSHOP_STATE_FILE })).toThrow(
      "chemin absolu distinct",
    );
  });

  it("preserves legacy sales and stock before the variation date and reproduces the varied payload on retry", async () => {
    const openingFile = join(directory, "opening.json");
    const opening = generateScenario(defaultScenarioOptions("2026-11-10", 7)).checkpoint;
    await writeFile(openingFile, JSON.stringify(opening));
    const env = { ...fixtureEnv(), WORKSHOP_OPENING_CHECKPOINT_FILE: openingFile, WORKSHOP_START_DATE: "2026-11-17" };
    const legacy = readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: join(directory, "legacy.json") });
    const cutover = "2026-11-19";
    const varied = readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: join(directory, "varied.json"),
      WORKSHOP_VARIATION_FROM: cutover });
    const now = new Date("2026-11-21T03:00:00+01:00");
    let failCutover = false;
    const send = vi.fn<typeof fetch>(async (input) => {
      const date = dayFromRequest(input);
      if (failCutover && date === cutover) {
        failCutover = false;
        return new Response(null, { status: 503 });
      }
      return Response.json({ date, replayed: false, stockApplied: true });
    });
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(legacy, now)).resolves.toEqual({ imported: 4, replayed: 0 });
    failCutover = true;
    await expect(syncDaily(varied, now)).rejects.toThrow("2026-11-19 (HTTP 503)");
    await expect(syncDaily(varied, now)).resolves.toEqual({ imported: 2, replayed: 0 });
    const bodies = send.mock.calls.map(([, request]) => request?.body);
    expect(bodies.slice(4, 6)).toEqual(bodies.slice(0, 2));
    expect(bodies[6]).toBe(bodies[7]);
    expect(bodies.slice(7)).not.toEqual(bodies.slice(2, 4));

    const before = generateScenario(defaultScenarioOptions("2026-11-17", 2), opening);
    const after = generateScenario({ ...defaultScenarioOptions(cutover, 2), incident: "mixed",
      weather: "varied", hasTerrace: true }, before.checkpoint);
    expect(parseCheckpointFile(await readFile(varied.stateFile, "utf8"))).toEqual({
      ...after.checkpoint,
      dossier: "2026-11-20-1",
    });
  });

  it("replays operations through a separate cursor and sends stock only when configured", async () => {
    const openingFile = join(directory, "opening.json");
    const opening = generateScenario(defaultScenarioOptions("2026-11-10", 7)).checkpoint;
    const env = { ...fixtureEnv(), WORKSHOP_OPENING_CHECKPOINT_FILE: openingFile, WORKSHOP_START_DATE: "2026-11-17" };
    await writeFile(openingFile, JSON.stringify(opening));
    const stockStateFile = join(directory, "stock.json");
    const oldCheckpoint = JSON.stringify(generateScenario(defaultScenarioOptions("2026-11-17", 1), opening).checkpoint);
    await writeFile(env.WORKSHOP_STATE_FILE, oldCheckpoint);
    await writeFile(stockStateFile, oldCheckpoint);
    const history = readDailySyncConfig({ ...env, WORKSHOP_OPERATIONS_STATE_FILE: join(directory, "history.json") });
    const daily = readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: stockStateFile,
      WORKSHOP_OPERATIONS_STATE_FILE: join(directory, "operations.json") });
    const date = "2026-11-17";
    const now = new Date("2026-11-18T03:00:00+01:00");
    const send = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ date, replayed: true, stockApplied: true }))
      .mockResolvedValueOnce(Response.json({ date, replayed: true, stockApplied: true, operationsApplied: true }))
      .mockResolvedValueOnce(Response.json({ date, replayed: true, operationsApplied: true }));
    vi.stubGlobal("fetch", send);

    await expect(syncDaily(daily, now)).rejects.toThrow("n’a pas confirmé la réception du 2026-11-17");
    await expect(readFile(daily.stateFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(syncDaily(daily, now)).resolves.toEqual({ imported: 0, replayed: 1 });
    await expect(syncDaily(history, now)).resolves.toEqual({ imported: 0, replayed: 1 });
    const { stock, ...withOperations } = JSON.parse(String(send.mock.calls[1][1]?.body));
    expect(stock).toHaveLength(13);
    expect(withOperations.operations.services[0].items.length).toBeGreaterThan(0);
    expect(JSON.parse(String(send.mock.calls[2][1]?.body))).toEqual(withOperations);
    expect(send.mock.calls[0][1]?.body).toBe(send.mock.calls[1][1]?.body);
    for (const path of [env.WORKSHOP_STATE_FILE, stockStateFile, daily.stateFile, history.stateFile]) {
      expect(await readFile(path, "utf8")).toBe(oldCheckpoint);
    }
    expect(() => readDailySyncConfig({ ...env, WORKSHOP_STOCK_STATE_FILE: stockStateFile,
      WORKSHOP_OPERATIONS_STATE_FILE: stockStateFile })).toThrow("distinct des fichiers de reprise des ventes et des stocks");
  });
});
