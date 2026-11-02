import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { ImpactMonthlyPeriod } from "../../services/impactService";
import { MonthlyReconciliation } from "./ImpactSummary";

it("affiche le coût des seules pertes enregistrées, avec ses limites", () => {
  const empty = { menuItemUnits: 0, serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0, unregistered: 1 },
    lossMovementCount: 0, knownLossCost: 0, unpricedLossMovementCount: 0, receivedCost: 10, receiptCount: 1,
    declaredWaste: { records: [], totals: [], excludedSimulationCount: 0 } };
  const make = (month: string, lossMovementCount: number, unpricedLossMovementCount: number, knownLossCost: number): ImpactMonthlyPeriod => ({
    month, from: `${month}-01`, to: `${month}-01`, calendarDays: 1,
    recorded: { ...empty, lossMovementCount, unpricedLossMovementCount, knownLossCost }, simulation: empty,
    hasRecordedData: true, hasSimulationData: false,
    excluded: { simulatedSales: 0, simulatedLosses: 0, simulatedReceiptLines: 0, lossUnitMismatch: 0, receiptUnitMismatch: 0 },
  });
  const excluded = make("2026-06", 0, 0, 0); excluded.excluded.lossUnitMismatch = 1;
  const noReceipt = make("2026-05", 1, 0, 0);
  noReceipt.recorded.receiptCount = 0; noReceipt.recorded.receivedCost = 0;
  const html = renderToStaticMarkup(createElement(MonthlyReconciliation, {
    periods: [make("2026-01", 0, 0, 0), make("2026-02", 1, 1, 0), make("2026-03", 2, 1, 5), make("2026-04", 1, 0, 0), noReceipt, excluded],
    currency: "EUR", pagination: { page: 0, pageCount: 1, totalMonths: 4, hasOlder: false, hasNewer: false },
    open: true, onOpenChange: () => {}, onOlder: () => {}, onNewer: () => {}, headingRef: createRef<HTMLHeadingElement>(),
  }));
  expect(html).toContain("Aucune perte enregistrée");
  expect(html).toContain("Pertes exclues pour unité incompatible");
  expect(html).toContain("Aucune vente enregistrée · aucun service complet pour confirmer un zéro");
  expect(html).not.toContain("0 unité déclarée");
  expect(html).toContain("Aucune réception enregistrée");
  expect(html).toContain("1 mouvement(s) · Indisponible");
  expect(html).toContain("valorisation partielle");
  expect(html).toMatch(/1 mouvement\(s\) · 0,00/);
});
