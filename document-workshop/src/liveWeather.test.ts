import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { workshopForecastSchema } from "../../shared/workshopForecast";
import type { WorkshopWeather } from "../../shared/workshopWeather";
import { ingredients } from "./catalog";
import { dailyForecast } from "./dailyForecast";
import { readDailySyncConfig, syncDaily } from "./dailySync";
import { forecastNeeds } from "./purchasing";
import { defaultScenarioOptions, generateScenario } from "./scenario";
import { liveServiceWeather } from "./weather";

const date = "2026-09-08";
const next = "2026-09-09";
const captured = `${date}T05:30:00.000Z`;
function forecast(day = date): WorkshopWeather {
  return { hasTerrace: true, forecast: { timezone: "Europe/Paris", issuedAt: null,
    fetchedAt: `${day}T05:30:00.000Z`, hours: [10, 11, 12, 17, 18, 19].map((hour, index) => ({
      time: `${day}T${hour}:00:00.000Z`, temperature: 20, windSpeed: 12, precipitation: index < 3 ? .5 : 0,
      precipitationProbability: index < 3 ? 80 : 10,
    })) } };
}

it("plans rain at lunch and a dry dinner independently, from covers through preparation and purchases", () => {
  const weather = forecast();
  const profile = { ...defaultScenarioOptions(date, 1), services: "both", covers: 120, variationPercent: 0 } as const;
  const opening = { ...generateScenario({ ...profile, start: "2026-09-07" }, undefined, []).checkpoint,
    lots: ingredients.map(product => ({ id: `opening-${product.id}`, productId: product.id, receivedOn: "2026-09-07",
      expiresOn: "2026-09-11", quantity: 100, unitCost: product.price })) };
  const baseline = generateScenario(profile, opening, []);
  const adjusted = generateScenario(profile, opening, [], weather);
  const [midi, soir] = adjusted.days[0].services;
  expect(midi.forecastCovers).toBe(Math.round(midi.baselineCovers * .85));
  expect(soir.forecastCovers).toBe(Math.round(soir.baselineCovers * 1.10));
  expect(midi.covers).toBe(midi.forecastCovers);
  expect(soir.covers).toBe(soir.forecastCovers);
  expect(midi.runs.reduce((sum, run) => sum + run.prepared, 0))
    .toBeLessThan(baseline.days[0].services[0].runs.reduce((sum, run) => sum + run.prepared, 0));
  expect(adjusted.days[0].events).toEqual(expect.arrayContaining([
    expect.stringContaining("Midi : Terrasse fermée"),
    expect.stringContaining("Soir : Terrasse ouverte"),
  ]));
  const predicted = workshopForecastSchema.parse(dailyForecast(date, opening, profile, true, weather));
  expect(predicted.serviceWeather).toMatchObject([
    { slot: "lunch", terrace: "closed", percent: -15, fetchedAt: captured },
    { slot: "dinner", terrace: "open", percent: 10, fetchedAt: captured },
  ]);
  expect(predicted.covers).toBe(midi.forecastCovers + soir.forecastCovers);
  const needs = forecastNeeds(date, next, profile, weather);
  expect(needs).not.toEqual(forecastNeeds(date, next, profile));
  expect(predicted.purchaseNeeds?.[0].products).toContainEqual(expect.objectContaining({
    name: "Filet de poulet", quantityMilli: Math.round(needs.poulet * 1000),
  }));
});

it("uses reference covers when the service weather is incomplete or collected after preparation", () => {
  const weather = forecast();
  expect(liveServiceWeather(date, "lunch", { ...weather, hasTerrace: false })).toMatchObject({ terrace: "none", percent: -5 });
  expect(liveServiceWeather(date, "lunch", { ...weather, hasTerrace: null })).toMatchObject({ terrace: "unknown", percent: 0 });
  weather.forecast!.hours[0].temperature = null;
  expect(liveServiceWeather(date, "lunch", weather)).toMatchObject({ terrace: "unknown", fetchedAt: null, percent: 0 });
  weather.forecast!.hours[0].temperature = 20;
  weather.forecast!.fetchedAt = `${date}T08:45:00.000Z`;
  expect(liveServiceWeather(date, "lunch", weather)).toMatchObject({ terrace: "unknown", fetchedAt: null, percent: 0 });
  expect(liveServiceWeather(date, "dinner", weather)).toMatchObject({ terrace: "open", percent: 10 });
  expect(liveServiceWeather("2026-09-07", "lunch", weather)).toMatchObject({ fetchedAt: null, percent: 0 });
});

it("replays yesterday with the forecast frozen before service and falls back if today's provider fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kookia-live-weather-"));
  const config = readDailySyncConfig({ WORKSHOP_API_ORIGIN: "https://kookia.example", WORKSHOP_IMPORT_TOKEN: "test-weather-token-".repeat(3),
    WORKSHOP_STATE_FILE: join(directory, "sales.json"), WORKSHOP_OPERATIONS_STATE_FILE: join(directory, "operations.json"),
    WORKSHOP_START_DATE: date, WORKSHOP_LIVE_WEATHER_FROM: date, WORKSHOP_FORECAST_ENABLED: "true" });
  const send = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(forecast()))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockRejectedValueOnce(new Error("lost acknowledgment"))
    .mockResolvedValueOnce(Response.json({ hasTerrace: true, forecast: null }))
    .mockResolvedValueOnce(Response.json({ date, replayed: true, operationsApplied: true }))
    .mockResolvedValueOnce(Response.json({ date: next }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", send);
  try {
    await expect(syncDaily(config, new Date(captured))).resolves.toEqual({ imported: 0, replayed: 0 });
    const saved = JSON.parse(await readFile(`${config.stateFile}.weather`, "utf8"));
    expect(saved).toEqual([{ date, weather: forecast() }]);
    await expect(syncDaily(config, new Date(`${next}T01:30:00Z`))).rejects.toThrow("Impossible de joindre Kookia");
    await expect(syncDaily(config, new Date(`${next}T01:35:00Z`))).resolves.toEqual({ imported: 0, replayed: 1 });
    expect(send.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      "/api/integrations/workshop/weather", "/api/integrations/workshop/weather", `/api/integrations/workshop/days/${date}`,
      "/api/integrations/workshop/weather", `/api/integrations/workshop/days/${date}`, `/api/integrations/workshop/forecast/${next}`,
    ]);
    expect(send.mock.calls[2][1]?.body).toBe(send.mock.calls[4][1]?.body);
    expect(send.mock.calls[2][1]?.body).toContain("Terrasse fermée dans la simulation");
    expect(send.mock.calls[5][1]?.body).toContain("Fréquentation de référence conservée");
    expect(warning).toHaveBeenCalledTimes(1);
  } finally {
    warning.mockRestore();
    vi.unstubAllGlobals();
    await rm(directory, { recursive: true, force: true });
  }
});
