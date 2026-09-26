import { expect, it } from "vitest";
import { reportCells, reportCsv, reportExcelXml, type Report } from "./reportService";
const report: Report = { from: "2026-09-01", to: "2026-09-30", timezone: "UTC", generatedAt: "2026-09-11T12:00:00Z",
  declaredLosses: { method: "Mouvements loss négatifs uniquement", dateBasis: "createdAt UTC",
    reportedMovementCount: 2, unpricedMovementCount: 1, incompatibleUnitMovementCount: 1,
    excludedSimulationMovementCount: 3, unavailableMetrics: ["stockouts", "unsold_quantity"] }, rows: [
  { section: "Stock", date: "2026-09-11", metric: '=HYPERLINK("bad")', value: -2.5, source: "A&B <test>" },
] };
it("escapes CSV cells and prevents string formula interpretation without changing negative numbers", () => {
  const csv = reportCsv(report);
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"-2.5"');
  expect(csv).toContain("2026-09-01");
  expect(csv).toContain('"Mouvements de perte inclus";"2";"Sans prix snapshoté";"1"');
    expect(csv).toContain('"Pertes hors bilan exclues";"3"');
  expect(csv).toContain('"Métriques non mesurées";"ruptures de stock ; quantités invendues"');
});
it("exports typed Excel XML without executable formulas or raw XML markup from data", () => {
  const xml = reportExcelXml(report);
  expect(xml).toContain('ss:Type="Number">-2.5');
  expect(xml).toContain("A&amp;B &lt;test&gt;");
  expect(xml).toContain("Unités incompatibles exclues");
  expect(xml).toContain("quantités invendues");
  expect(xml).not.toContain("ss:Formula");
});

it("omits demonstration provenance from operational exports when no such losses were excluded", () => {
  const recordedOnly = { ...report, declaredLosses: { ...report.declaredLosses, excludedSimulationMovementCount: 0 } };
    expect(reportCells(recordedOnly).flat().join(" ")).not.toMatch(/démonstration|simulée?/i);
});
