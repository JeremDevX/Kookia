import { expect, it } from "vitest";
import { workshopOperationsSchema } from "../../server/src/application/workspace/workshopOperationsInput";
import { offsetDate } from "./calendar";
import { recipeById } from "./catalog";
import { dailyOperations } from "./dailyOperations";
import { dailyStock } from "./dailyStock";
import { dailySales } from "./documents";
import type { Checkpoint } from "./model";
import { defaultScenarioOptions, generateScenario } from "./scenario";

it("projects orders, receipts, services and losses for 90 consecutive simulated dates", () => {
  const start = "2026-08-20";
  const profile = { ...defaultScenarioOptions(start, 1), incident: "mixed", weather: "varied", hasTerrace: true } as const;
  const losses = new Set<string>();
  const pending = new Map<string, Array<{ name: string; orderedMilli: number }>>();
  let checkpoint: Checkpoint | undefined;
  let receiptForPriorOrder = false;
  let closedDay = false;
  for (let index = 0; index < 90; index++) {
    const date = offsetDate(start, index);
    const scenario = generateScenario({ ...profile, start: date }, checkpoint);
    const day = scenario.days[0];
    const operations = workshopOperationsSchema.parse(dailyOperations(scenario));
    for (const purchase of operations.purchases) {
      const ordered = purchase.lines.map(({ name, orderedMilli }) => ({ name, orderedMilli }));
      if (purchase.receipt) {
        const suffix = purchase.reference.slice(3);
        expect(purchase.receipt).toEqual({
          deliveryReference: `BL-${suffix}`, invoiceReference: `FA-${suffix}`, invoiceOn: offsetDate(date, 1),
        });
        expect(purchase.orderedOn < date).toBe(true);
        if (pending.has(purchase.reference)) {
          expect(ordered).toEqual(pending.get(purchase.reference));
          receiptForPriorOrder = true;
        }
      } else {
        expect(purchase.orderedOn).toBe(date);
        expect(purchase.lines.every(line => line.receivedMilli === 0)).toBe(true);
        pending.set(purchase.reference, ordered);
      }
    }
    const sold = new Map<string, number>();
    for (const [index, service] of operations.services.entries()) {
      expect(service.covers).toBe(day.services[index].transactions.reduce((sum, transaction) => sum + transaction.covers, 0));
      for (const item of service.items) {
        if (item.sold > 0) sold.set(item.name, (sold.get(item.name) ?? 0) + item.sold);
      }
    }
    const cashierSales = new Map(Array.from(dailySales(day).articles, ([id, row]) => [recipeById(id).name, row.sold]));
    expect(sold).toEqual(cashierSales);
    const rawLossByLot = new Map<string, number>();
    for (const loss of operations.losses) {
      losses.add(loss.kind);
      if (loss.kind === "raw" && loss.lotReference) {
        rawLossByLot.set(loss.lotReference, (rawLossByLot.get(loss.lotReference) ?? 0) + loss.quantityMilli);
      }
    }
    const stock = dailyStock(scenario);
    for (const loss of operations.losses.filter(row => row.product)) {
      expect(loss.supplier).toBeDefined();
      expect(loss.supplier).toBe(stock.find(product => product.name === loss.product && product.unit === loss.unit)?.supplier);
    }
    const stockLossByLot = new Map(stock.flatMap(product => product.lots)
      .filter(lot => lot.lossMilli > 0).map(lot => [lot.reference, lot.lossMilli]));
    expect(rawLossByLot).toEqual(stockLossByLot);
    if (!day.open) {
      expect(operations.services).toEqual([]);
      closedDay = true;
    }
    checkpoint = scenario.checkpoint;
  }
  expect(receiptForPriorOrder).toBe(true);
  expect(closedDay).toBe(true);
  expect(losses).toEqual(new Set(["raw", "preparation", "unsold", "plate_return"]));
});
