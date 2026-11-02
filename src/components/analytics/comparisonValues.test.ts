import { expect, it } from "vitest";
import type { ImpactBucket, ImpactPeriod } from "../../services/impactService";
import { comparisonValues } from "./comparisonValues";

function period(overrides: Partial<ImpactBucket> = {}): ImpactPeriod {
  const recorded = { menuItemUnits: 0, serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0, unregistered: 1 },
    lossMovementCount: 0, knownLossCost: 0, unpricedLossMovementCount: 0, receiptCount: 0, receivedCost: 0, ...overrides } as ImpactBucket;
  return { recorded, excluded: { simulatedSales: 0, simulatedLosses: 0, simulatedReceiptLines: 0, lossUnitMismatch: 0, receiptUnitMismatch: 0 } } as ImpactPeriod;
}

it("ne déduit pas des ventes ni des pertes d’une réception seule", () => {
  const values = comparisonValues(period({ receiptCount: 1, receivedCost: 0 }), "EUR");
  expect(values.sales).toBe("Aucune donnée de vente");
  expect(values.losses).toBe("Aucune perte enregistrée");
  expect(values.services).toBe("Aucune donnée de service");
  expect(values.receipts).toMatch(/^0,00/);
});

it("distingue un coût connu nul d’une perte non valorisée ou partiellement valorisée", () => {
  expect(comparisonValues(period({ lossMovementCount: 1, knownLossCost: 0 }), "EUR").losses).toMatch(/^0,00/);
  expect(comparisonValues(period({ lossMovementCount: 1, unpricedLossMovementCount: 1 }), "EUR").losses).toBe("Valorisation indisponible ou incomplète");
  expect(comparisonValues(period({ lossMovementCount: 2, unpricedLossMovementCount: 1, knownLossCost: 12 }), "EUR").losses).toContain("valorisation incomplète");
});

it("affiche le zéro d’un service complet et signale une couverture incomplète", () => {
  const values = comparisonValues(period({ serviceDays: { complete: 1, partial: 0, coverageMissing: 0, closed: 0, unregistered: 1 } }), "EUR");
  expect(values.sales).toBe("0 · couverture incomplète");
  expect(values.services).toBe("1 · calendrier incomplet");
});

it("signale les mouvements et réceptions écartés", () => {
  const input = period({ lossMovementCount: 1, knownLossCost: 5 });
  input.excluded.lossUnitMismatch = 1; input.excluded.receiptUnitMismatch = 1;
  const values = comparisonValues(input, "EUR");
  expect(values.losses).toContain("valorisation incomplète");
  expect(values.receipts).toBe("Données de réception exclues");
});
