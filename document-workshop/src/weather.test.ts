import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { optionsSchema } from "./model";
import { serviceForecast } from "./forecast";
import { scenarioWeather } from "./weather";
import { forecastNeeds } from "./purchasing";
import { generateScenario } from "./scenario";
import { createDocuments, salesCsv } from "./documents";
import { archiveFiles } from "./dossier";
import { parseCheckpointFile } from "./continuation";
import { Settings } from "./Settings";
import { ScenarioSummary } from "./ScenarioSummary";
import { workshopOptions as input } from "./testFixtures";

describe("document workshop terrace and weather", () => {
  it.each([
    ["rain", -5, -15], ["fog", -3, -10], ["clear", 3, 10], ["storm", -10, -30],
  ] as const)("uses the shared coefficients for %s with explicit scenario provenance", (weather, without, withTerrace) => {
    expect(scenarioWeather(input.start, { ...input, weather, hasTerrace: false }).percent).toBe(without);
    expect(scenarioWeather(input.start, { ...input, weather, hasTerrace: true })).toMatchObject({
      source: "scenario", policyVersion: "terrace-weather-v1", hasTerrace: true, percent: withTerrace,
    });
    expect(scenarioWeather(input.start, { ...input, weather, hasTerrace: null }).percent).toBe(0);
  });
  it("keeps legacy settings, unknown terraces, missing weather and closed services unadjusted", () => {
    const legacy = { ...input }; delete (legacy as Partial<typeof input>).hasTerrace; delete (legacy as Partial<typeof input>).weather;
    expect(optionsSchema.parse(legacy)).toMatchObject({ hasTerrace: null, weather: "none" });
    expect(serviceForecast(input.start, "lunch", { ...input, weather: "rain", hasTerrace: null })).toEqual({ baselineCovers: 36, forecastCovers: 36 });
    expect(serviceForecast(input.start, "lunch", { ...input, weather: "none", hasTerrace: true })).toEqual({ baselineCovers: 36, forecastCovers: 36 });
    expect(serviceForecast("2026-09-07", "lunch", { ...input, weather: "clear", hasTerrace: true })).toEqual({ baselineCovers: 0, forecastCovers: 0 });
    expect(scenarioWeather("2026-12-01", { ...input, weather: "clear", hasTerrace: true })).toMatchObject({ percent: 0, conditions: { temperatureMax: 9 } });
    for (const change of [{ hasTerrace: "yes" }, { hasTerrace: 1 }, { weather: "live" }, { weather: null }])
      expect(optionsSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it("adjusts only once before portions and purchasing, keeping the calendar base and future demand separate", () => {
    const rainy = { ...input, hasTerrace: true, weather: "rain" as const, variationPercent: 0, days: 1 };
    const scenario = generateScenario(rainy);
    expect(scenario.days[0]).toMatchObject({ baselineCovers: 36, forecastCovers: 31, covers: 31 });
    expect(serviceForecast(input.start, "lunch", { ...rainy, hasTerrace: false })).toEqual({ baselineCovers: 36, forecastCovers: 34 });
    const normalNeeds = forecastNeeds(input.start, "2026-09-07", { ...rainy, weather: "none" });
    const rainyNeeds = forecastNeeds(input.start, "2026-09-07", rainy);
    expect(Object.keys(rainyNeeds).every(id => rainyNeeds[id] <= normalNeeds[id])).toBe(true);
    expect(Object.keys(rainyNeeds).some(id => rainyNeeds[id] < normalNeeds[id])).toBe(true);
    const unexpected = generateScenario({ ...rainy, variationPercent: 50, incident: "demand_shift" });
    expect(unexpected.days[0].forecastCovers).toBe(31);
    expect(unexpected.days[0].covers).not.toBe(31);
    const initialOrders = (s: typeof scenario) => s.purchases.filter(p => p.placedOn < input.start);
    expect(initialOrders(unexpected)).toEqual(initialOrders(scenario));
    expect(unexpected.days[0].services[0].runs.map(r => r.prepared - r.extraPrepared))
      .toEqual(scenario.days[0].services[0].runs.map(r => r.prepared - r.extraPrepared));
  });
  it("keeps weather deterministic across resumes and retains the new evidence in PDFs and ZIP without changing CSV contracts", () => {
    const options = { ...input, hasTerrace: true, weather: "varied" as const, services: "both" as const, days: 7 };
    const scenario = generateScenario(options), first = generateScenario({ ...options, days: 3 });
    const next = generateScenario({ ...options, start: "2026-09-04", days: 4 }, parseCheckpointFile(JSON.stringify(first)));
    expect(next.days).toEqual(scenario.days.slice(3));
    expect(next.checkpoint.lots).toEqual(scenario.checkpoint.lots);
    expect(new Set(scenario.days.map(d => d.weather.conditions?.weatherCode)).size).toBeGreaterThan(1);
    const docs = createDocuments(scenario);
    expect(docs.find(d => d.kind === "identity")!.sections[0].rows).toContainEqual(["Terrasse", "Oui"]);
    const forecast = docs.find(d => d.kind === "forecast")!;
    expect(forecast.sections[0].columns).toEqual(["Service", "Base semaine/saison", "Effet météo", "Prévu ajusté"]);
    expect(forecast.sections[0].rows).toHaveLength(2);
    expect(forecast.notes.join(" ")).toContain("Météo de scénario");
    expect(forecast.notes.join(" ")).toContain("non calibrés");
    const files = archiveFiles(scenario, docs), decode = (name: string) => new TextDecoder().decode(files.find(f => f.name === name)!.bytes);
    expect(JSON.parse(decode("scenario.json")).days[0].weather).toEqual(scenario.days[0].weather);
    expect(decode("guide.md")).toContain("Ne pas réappliquer le coefficient");
    expect(decode("guide.md")).toContain("ne mesure donc pas un gain prédictif");
    expect(salesCsv(scenario).split(/\r?\n/)[0]).toBe("service_date,item_name,quantity");
    expect(parseCheckpointFile(decode("stock-reprise.json"))).toEqual(scenario.checkpoint);
  });
  it("renders named native settings and distinguishes the base, conditions and adjusted result", () => {
    const options = { ...input, hasTerrace: true, weather: "rain" as const, days: 1 };
    const settings = renderToStaticMarkup(createElement(Settings, { value: options, onChange: () => {} }));
    expect(settings).toContain("Terrasse et météo"); expect(settings).toContain("Météo du dossier");
    expect(settings).toContain('aria-describedby="workshop-weather-help"');
    expect(settings).toContain('<option value="yes" selected="">Oui</option>');
    expect(settings).toContain('<option value="rain" selected="">Pluie</option>');
    const summary = renderToStaticMarkup(createElement(ScenarioSummary, { scenario: generateScenario(options) }));
    expect(summary).toContain("Base avant météo"); expect(summary).toContain("Prévu ajusté");
    expect(summary).toContain("Pluie"); expect(summary).toContain("-15 %");
    expect(summary).toContain("sans observation ni prévision Open-Meteo");
  });
});
