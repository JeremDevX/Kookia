import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import type { ImpactBucket } from "../../services/impactService";
import { RecordedOperations } from "./ImpactSummary";

it("distingue les pertes sans prix et partiellement valorisées dans les détails", () => {
  const item = { productId: "p1", productName: "Tomate", unit: "kg", quantity: 2, knownCost: 0,
    unpricedMovementCount: 1, movementCount: 1, operationIds: [], movementIds: [] };
  const bucket = { lossesByProduct: [item], lossMovementCount: 1, unpricedLossMovementCount: 1, knownLossCost: 0,
    receiptsByProduct: [], receivedCost: 0, receiptCount: 0, menuItemUnits: 0, salesByItem: [],
    serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0, unregistered: 1 },
    declaredWaste: { records: [], totals: [], excludedSimulationCount: 0 } } satisfies ImpactBucket;
  const render = (data: ImpactBucket) => renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(RecordedOperations,
    { bucket: data, currency: "EUR", from: "2026-01-01", to: "2026-01-31", excludedLosses: 0 })));
  const unavailable = render(bucket);
  expect(unavailable).toContain("<td>Indisponible · 1 mouvement(s) sans prix historique</td>");
  expect(unavailable).toContain("Coût connu des pertes : <strong>Indisponible</strong>");
  expect(unavailable).toContain("0 lignes · Aucune réception enregistrée");
  expect(unavailable).toContain("Dépenses de produits réceptionnés : <strong>Indisponible</strong>");
  const partial = render({ ...bucket, lossMovementCount: 2, knownLossCost: 5,
    lossesByProduct: [{ ...item, movementCount: 2, knownCost: 5 }] });
  expect(partial).toContain("valorisation partielle");
});


it("signale les pertes exclues même sans mouvement valorisable", () => {
  const bucket = { lossesByProduct: [], lossMovementCount: 0, unpricedLossMovementCount: 0, knownLossCost: 0,
    receiptsByProduct: [], receivedCost: 0, receiptCount: 0 } as unknown as ImpactBucket;
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(RecordedOperations,
    { bucket, currency: "EUR", from: "2026-01-01", to: "2026-01-31", excludedLosses: 1 })));
  expect(html).toContain("Pertes exclues pour unité incompatible");
  expect(html).not.toContain("Aucune perte enregistrée");
});
