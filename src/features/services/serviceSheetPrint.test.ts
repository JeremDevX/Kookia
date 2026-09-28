import { expect, it } from "vitest";
import { serviceSheetHtml } from "./serviceSheetPrint";
import { forecastSheetPlan } from "./serviceSheetForecast";
import type { ServiceSheet } from "../../../shared/serviceSheet";
import type { MenuEntry } from "../../../shared/serviceOperations";
import type { ForecastItem } from "../../../shared/operationalForecast";

const sheet: ServiceSheet = { serviceDate: "2026-09-21", slot: "lunch", revision: 1, state: "draft", planned: [], outcomes: [],
  substitutions: [], note: '<script>alert("x")</script>', menuEntries: [], menuRevision: 2, validatedAt: null, validatedBy: null,
  closedAt: null, closedBy: null, factsChangedSinceClosure: false, closureFacts: null,
  forecastKey: null, forecastReference: null,
  facts: { menuRevision: 2, productionIds: [], refusalIds: [], unallocatedRefusals: 0, saleRevisions: [], wasteIds: [], coverage: "partial", unallocatedSales: 2,
    dailyRefunds: [],
    unallocatedProductions: 0, staleAllocations: 0, unmappedSales: 0, gaps: ["Ventes partielles"], lines: [{ recipeId: "main",
      recipeName: "Plat & légumes", planned: 10, adjustedPlanned: 10, prepared: 10, additionalPrepared: 0, soldObserved: 2,
      sold: null, refused: 0, preparationLosses: [], plateReturns: 0, unsold: null, retained: 0, discarded: 0,
      recordedUnsoldWaste: 0, unexplained: null, explanation: ["Ne pas assimiler au gaspillage"] }] } };

it("exports a printable semantic document with unknown values and escaped user content", () => {
  const html = serviceSheetHtml(sheet);
  expect(html).toContain('<html lang="fr">'); expect(html).toContain('scope="row"');
  expect(html).toContain("Plat &amp; légumes"); expect(html).toContain("Inconnu");
  expect(html).not.toContain('<script>alert'); expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Ventes partielles"); expect(html).toContain("@media print");
});
it("prints the immutable closure facts while warning about later corrected operations", () => {
  const html = serviceSheetHtml({ ...sheet, state: "closed", closedAt: "2026-09-21T20:00:00Z", closedBy: "chef",
    factsChangedSinceClosure: true, closureFacts: { ...sheet.facts, gaps: [], lines: [{ ...sheet.facts.lines[0], sold: 7, unsold: 3, retained: 3, unexplained: 0 }] } });
  expect(html).toContain("constat imprimé reste celui de la clôture"); expect(html).toContain("<td>7</td><td>3</td>");
  expect(html).not.toContain("Ventes partielles");
});
it("prints refund references as non-ventilated day-level signals without inventing amounts", () => {
  const html = serviceSheetHtml({ ...sheet, facts: { ...sheet.facts, dailyRefunds: [{ id: "refund-ref", saleId: "sale-ref",
    serviceDate: sheet.serviceDate, serviceSlot: null, saleItemName: "Plat", amount: null,
    recordedAt: "2026-09-21T12:00:00Z", reason: "Erreur facturation" }] } });
  expect(html).toContain("refund-ref"); expect(html).toContain("sale-ref");
  expect(html).toContain("Service non ventilé"); expect(html).toContain("montants ne sont pas renseignés");
});
it("projects formulas once and rounds recipe totals rather than each article separately", () => {
  const entries = ["a", "b"].map(id => ({ id, components: [{ recipeId: "main", portions: .5 }] })) as MenuEntry[];
  const items = [{ entryId: "a", quantity: 1.2 }, { entryId: "b", quantity: 1.2 }] as ForecastItem[];
  expect(forecastSheetPlan(entries, items)).toEqual([{ recipeId: "main", portions: 2 }]);
  expect(forecastSheetPlan(entries, [{ entryId: "a", quantity: null }] as ForecastItem[])).toBeNull();
});
it.each([undefined, "day"] as const)("prints captured weather (%s) without changing its scope or fetching today's weather", basis => {
  expect(serviceSheetHtml({ ...sheet, weatherContext: { status: "not_saved", reason: "not_consulted" } })).toContain("Contexte météo non conservé");
  const html = serviceSheetHtml({ ...sheet, weatherContext: { status: "saved", weather: {
    serviceDate: sheet.serviceDate, slot: sheet.slot, status: "partial", reason: "<script>weather</script>",
    source: "Open-Meteo", provenance: "fixture", position: null, window: { opensAt: basis ? "00:00" : "12:00", closesAt: basis ? "24:00" : "14:00", timezone: "Europe/Paris", basis },
    hours: [{ time: "2026-09-21T10:00:00Z", temperature: 18, precipitation: null, precipitationProbability: null, windSpeed: 10 }],
    summary: { weatherCode: 45, temperatureMin: 18, temperatureMax: 18, maxHourlyPrecipitationProbability: null, maxWindSpeed: 10 }, expectedHours: 2, completeHours: 0, fetchedAt: "2026-09-21T08:00:00Z", issuedAt: null,
    expiresAt: "2026-09-21T14:00:00Z", contextRef: "reference",
    units: { temperature: "°C", precipitation: "mm", precipitationProbability: "%", windSpeed: "km/h" },
  } } });
  expect(html).toContain("Contexte conservé avec la décision"); expect(html).toContain("2026-09-21T08:00:00Z");
  expect(html).toContain(basis ? "Journée entière" : "12:00–14:00");
  if (basis) expect(html).toContain("Brouillard : épisode le plus marqué");
  expect(html).toContain("pluie Inconnu mm"); expect(html).toContain("https://open-meteo.com/");
  expect(html).not.toContain("<script>weather</script>"); expect(html).toContain("&lt;script&gt;weather");
});
