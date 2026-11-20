import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { workshopRunEventSchema } from "../../shared/workshopControl";
import { workshopForecastSchema } from "../../shared/workshopForecast";
import { syncDaily } from "./dailySync";
import { readDailySyncConfig } from "./dailySyncConfig";

const date = "2026-09-08";
const today = "2026-09-09";
const now = new Date(`${today}T01:30:00Z`);
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "kookia-workshop-control-"));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

function config(start = date) {
  return readDailySyncConfig({
    WORKSHOP_API_ORIGIN: "https://kookia.example",
    WORKSHOP_IMPORT_TOKEN: "example-test-token-for-kookia-workshop",
    WORKSHOP_STATE_FILE: join(directory, "sales.json"),
    WORKSHOP_OPERATIONS_STATE_FILE: join(directory, "operations.json"),
    WORKSHOP_START_DATE: start,
    WORKSHOP_CONTROL_FROM: date,
    WORKSHOP_FORECAST_ENABLED: "true",
  });
}

const path = (input: URL | RequestInfo) => new URL(String(input)).pathname;
const control = { settings: [], weeklyServices: [], retryRequested: false };

it("polls only when enabled, without running unless a retry is queued and acquired", async () => {
  const send = vi.fn<typeof fetch>()
    .mockImplementationOnce(async () => Response.json(control))
    .mockImplementationOnce(async () => Response.json({ ...control, retryRequested: true }))
    .mockImplementationOnce(async () => Response.json({ error: { code: "WORKSHOP_RUN_IN_PROGRESS" } }, { status: 409 }));
  vi.stubGlobal("fetch", send);
  await expect(syncDaily(config(), new Date("2026-09-07T21:30:00Z"), true)).resolves.toBeUndefined();
  expect(send).not.toHaveBeenCalled();
  await expect(syncDaily(config(), now, true)).resolves.toBeUndefined();
  await expect(syncDaily(config(), now, true)).resolves.toBeUndefined();
  expect(send.mock.calls.map(([url, request]) => [path(url), request?.method])).toEqual([
    ["/api/integrations/workshop/control", "GET"], ["/api/integrations/workshop/control", "GET"],
    ["/api/integrations/workshop/run", "PUT"],
  ]);
  expect(send.mock.calls[0][1]?.headers).toEqual({ authorization: "Bearer example-test-token-for-kookia-workshop" });
  await expect(readFile(config().stateFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
});

it("records a curated failure and replays the frozen day through the queued retry", async () => {
  const settings = [
    { covers: 200, incidentEvery: 3, effectiveFrom: "2026-09-10", revision: 3 },
    { covers: 80, incidentEvery: 3, effectiveFrom: today, revision: 2 },
    { covers: 24, incidentEvery: 1, effectiveFrom: date, revision: 1 },
  ];
  const weeklyServices = [
    { weekday: 2, slot: "dinner", opensAt: "18:30", closesAt: "20:30" },
    { weekday: 3, slot: "lunch", opensAt: "13:30", closesAt: "15:30" },
    { weekday: 3, slot: "dinner", opensAt: "14:00", closesAt: "16:00" },
  ];
  const events: Array<ReturnType<typeof workshopRunEventSchema.parse>> = [];
  const imports: string[] = [];
  const configured = config("2026-09-07");
  let forecast: ReturnType<typeof workshopForecastSchema.parse> | undefined;
  const send = vi.fn<typeof fetch>(async (input, request) => {
    const endpoint = path(input).split("/").at(-1);
    const body = String(request?.body);
    if (endpoint === "control") {
      const retryRequested = imports.length > 1;
      return Response.json({ settings, weeklyServices: retryRequested ? weeklyServices.slice(1) : weeklyServices, retryRequested });
    }
    if (endpoint === "run") {
      events.push(workshopRunEventSchema.parse(JSON.parse(body)));
      return Response.json({ ok: true });
    }
    if (endpoint === today) {
      forecast = workshopForecastSchema.parse(JSON.parse(body));
      return Response.json({ date: today });
    }
    imports.push(body);
    if (imports.length === 2) return Response.json({
      error: { code: "WORKSHOP_STOCK_CONFLICT", message: "Le produit « Tomates » ou ses lots diffèrent du stock d’ouverture de l’atelier. Détail privé." },
    }, { status: 409 });
    return Response.json({ date: endpoint, replayed: imports.length === 3, operationsApplied: true });
  });
  vi.stubGlobal("fetch", send);

  await expect(syncDaily(configured, now)).rejects.toThrow("HTTP 409");
  expect(JSON.parse(imports[0])).toMatchObject({ open: false, operations: { services: [] } });
  expect(JSON.parse(imports[1])).toMatchObject({ open: true, operations: { services: [{ slot: "dinner" }] } });
  expect(JSON.parse(imports[1]).operations.incident).not.toBe("normal");
  expect(events[1]).toEqual({ id: events[0].id, state: "failed", date, step: "import",
    issue: { code: "STOCK_CONFLICT", product: "Tomates", status: 409 } });
  expect(JSON.parse(await readFile(`${configured.stateFile}.pending`, "utf8")).payload).toEqual(JSON.parse(imports[1]));

  await expect(syncDaily(configured, now, true)).resolves.toEqual({ imported: 0, replayed: 1 });
  expect(imports[2]).toBe(imports[1]);
  expect(events[3]).toEqual({ id: events[2].id, state: "succeeded", date: today, step: null, issue: null });
  expect(forecast?.plannedServices).toEqual([
    { slot: "lunch", baselineCovers: 43, forecastCovers: 43, plannedPortions: expect.any(Number), opensAt: "13:30", closesAt: "15:30" },
    { slot: "dinner", baselineCovers: 29, forecastCovers: 29, plannedPortions: expect.any(Number), opensAt: "14:00", closesAt: "16:00" },
  ]);
  expect(forecast?.hours.map(hour => hour.hour)).toEqual([13, 14, 15]);
  await expect(readFile(`${configured.stateFile}.pending`, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
});
