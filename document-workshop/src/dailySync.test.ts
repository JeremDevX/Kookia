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
});
