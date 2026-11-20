import { expect, it } from "vitest";
import { suppliers } from "./catalog";
import { dailyStock } from "./dailyStock";
import { defaultScenarioOptions, generateScenario } from "./scenario";

it("projects receipts, raw loss, adjustments and exact closing balances in milli-units", () => {
  const opening = generateScenario(defaultScenarioOptions("2026-11-10", 7)).checkpoint;
  const first = defaultScenarioOptions("2026-11-17", 1);
  const withLoss = generateScenario({ ...first, incident: "high_waste", incidentEvery: 1 }, opening);
  const withNegativeCount = generateScenario({ ...first, incident: "stock_gap", incidentEvery: 1 }, opening);
  const withPositiveCount = generateScenario({ ...first, start: "2026-11-18", incident: "stock_gap", incidentEvery: 1 },
    withNegativeCount.checkpoint);
  const milli = (amount: number) => Math.round(amount * 1000);

  expect(withLoss.days[0].waste.some(waste => waste.stockEffect)).toBe(true);
  expect(withNegativeCount.days[0].stock.some(line => line.adjustment < 0)).toBe(true);
  expect(withPositiveCount.days[0].stock.some(line => line.adjustment > 0)).toBe(true);
  expect(dailyStock(withNegativeCount).flatMap(({ lots }) => lots
    .filter(lot => lot.adjustmentOutMilli > 0).map(({ reference, adjustmentOutMilli }) => ({ reference, adjustmentOutMilli }))))
    .toEqual([{ reference: "LOT-BC-2026-11-16-1-MARA-poireau", adjustmentOutMilli: 159 }]);
  for (const scenario of [withLoss, withNegativeCount, withPositiveCount]) {
    const day = scenario.days[0];
    const stock = dailyStock(scenario);
    expect(stock).toHaveLength(scenario.catalog.ingredients.length);
    for (const [index, product] of scenario.catalog.ingredients.entries()) {
      const { opening, received, loss, consumed, adjustment, closing } = day.stock.find(line => line.id === product.id)!;
      const { name, unit, supplier, lots } = stock[index];
      expect({ name, unit, supplier }).toEqual({
        name: product.name, unit: product.unit, supplier: suppliers.find(entry => entry.id === product.supplier)!.name,
      });
      let consumedMilli = 0;
      for (const lot of lots) {
        const closes = day.closingLots.find(closingLot => closingLot.id === lot.reference);
        expect(lot.closingMilli).toBe(milli(closes?.quantity ?? 0));
        expect(lot.openingMilli > 0).toBe(lot.addition === null);
        expect(lot.addedMilli > 0).toBe(lot.addition !== null);
        consumedMilli += lot.openingMilli + lot.addedMilli - lot.closingMilli - lot.lossMilli - lot.adjustmentOutMilli;
      }
      expect(lots.reduce((total, lot) => total + lot.openingMilli, 0)).toBe(milli(opening));
      expect(lots.reduce((total, lot) => total + (lot.addition === "delivery" ? lot.addedMilli : 0), 0)).toBe(milli(received));
      expect(lots.reduce((total, lot) => total + (lot.addition === "adjustment" ? lot.addedMilli : 0), 0)).toBe(milli(Math.max(0, adjustment)));
      expect(lots.reduce((total, lot) => total + lot.adjustmentOutMilli, 0)).toBe(milli(Math.max(0, -adjustment)));
      expect(lots.reduce((total, lot) => total + lot.lossMilli, 0)).toBe(milli(loss));
      expect(lots.reduce((total, lot) => total + lot.closingMilli, 0)).toBe(milli(closing));
      expect(consumedMilli).toBe(milli(consumed));
    }
  }
});
