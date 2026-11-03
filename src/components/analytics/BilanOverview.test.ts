import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ImpactBucket, ImpactPeriod } from "../../services/impactService";
import BilanOverview from "./BilanOverview";

const bucket = (): ImpactBucket => ({
  menuItemUnits: 0, salesByItem: [], serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0, unregistered: 30 },
  lossesByProduct: [], knownLossCost: 0, unpricedLossMovementCount: 0, lossMovementCount: 0,
  receivedCost: 0, receiptCount: 0, receiptsByProduct: [], declaredWaste: { records: [], totals: [], excludedSimulationCount: 0 },
});
function period(recorded: ImpactBucket): ImpactPeriod {
  return { from: "2026-09-01", to: "2026-09-30", calendarDays: 30, recorded, simulation: bucket(),
    hasRecordedData: true, hasSimulationData: false,
    excluded: { simulatedSales: 0, simulatedLosses: 0, simulatedReceiptLines: 0, lossUnitMismatch: 0, receiptUnitMismatch: 0 } };
}
function render(recorded: ImpactBucket) {
  return renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(BilanOverview, {
    report: { current: period(recorded), prior: period(bucket()), currency: "EUR" },
  })));
}

describe("Bilan overview reading safeguards", () => {
  it("keeps missing operations unknown and offers the relevant next steps", () => {
    const html = render(bucket());
    expect(html.match(/class="bilan-kpi-value">—/g)).toHaveLength(3);
    expect(html).toContain("30 jours à compléter");
    expect(html).toContain("Services complets enregistrés</h3><p class=\"bilan-kpi-value\">0</p>");
    expect(html).toContain("30 jours restent à compléter");
    expect(html).not.toContain("Calendrier de service renseigné");
    expect(html).toContain('href="/sales#sales-start"');
    expect(html).toContain('href="/orders"');
  });
  it("shows recorded complete services with calendar coverage", () => {
    const html = render({ ...bucket(), serviceDays: { complete: 22, partial: 0, coverageMissing: 0, closed: 8, unregistered: 0 } });
    expect(html).toContain("Services complets enregistrés</h3><p class=\"bilan-kpi-value\">22</p>");
    expect(html).toContain("Calendrier de service renseigné");
  });
  it("shows entered sales while keeping incomplete coverage explicit", () => {
    const html = render({ ...bucket(), menuItemUnits: 120, receiptCount: 2, receivedCost: 450 });
    expect(html).toContain('class="bilan-kpi-value">120');
    expect(html).toContain("Historique de ventes incomplet");
    expect(html).not.toContain("Aucun achat réceptionné sur cette période");
  });
  it("distingue une perte sans prix d’un coût connu nul", () => {
    const unpriced = render({ ...bucket(), lossMovementCount: 1, unpricedLossMovementCount: 1 });
    expect(unpriced).toContain('class="bilan-kpi-value">Indisponible');
    const zero = render({ ...bucket(), lossMovementCount: 1, knownLossCost: 0 });
    expect(zero).toMatch(/class="bilan-kpi-value">0,00/);
  });
  it("does not present a partial loss valuation as complete", () => {
    const html = render({ ...bucket(), lossMovementCount: 2, unpricedLossMovementCount: 1, knownLossCost: 15 });
    expect(html).toContain("Valorisation partielle : 1 pertes restent à valoriser");
    expect(html).toContain("Le montant affiché ne couvre pas toutes les pertes déclarées");
  });
});

it("ne classe pas une perte sans prix comme une valeur nulle", () => {
  const item = { productId: "p1", productName: "Tomate", unit: "kg", quantity: 2, knownCost: 0,
    unpricedMovementCount: 1, movementCount: 1, operationIds: [], movementIds: [] };
  const html = render({ ...bucket(), lossMovementCount: 1, unpricedLossMovementCount: 1, lossesByProduct: [item] });
  expect(html).toContain("Tomate");
  expect(html).toContain("<strong>Indisponible</strong>");
  expect(html).not.toContain("0,00");
});
