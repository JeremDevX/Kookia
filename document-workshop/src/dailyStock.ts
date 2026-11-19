import type { Lot, Scenario } from "./model";
import { receivedLot } from "./purchasing";

type StockAddition = "delivery" | "adjustment" | null;
interface DailyStockLot {
  reference: string;
  receivedOn: string;
  expiresOn: string;
  unitCostCents: number;
  openingMilli: number;
  addedMilli: number;
  closingMilli: number;
  lossMilli: number;
  addition: StockAddition;
  adjustmentOutMilli: number;
}

export const toMilliUnits = (amount: number) => Math.round(amount * 1000);

export function dailyStock(scenario: Scenario) {
  const day = scenario.days[0];
  const closingByReference = new Map(day.closingLots.map(lot => [lot.id, lot]));
  const adjustmentByReference = new Map(day.countRemovals.map(({ lotId, quantity }) => [lotId, toMilliUnits(quantity)]));
  const lossByReference = new Map<string, number>();
  for (const waste of day.waste) {
    if (!waste.stockEffect || !waste.lotId) continue;
    lossByReference.set(waste.lotId, (lossByReference.get(waste.lotId) ?? 0) + toMilliUnits(waste.quantity));
  }

  const lotsByProduct = new Map(scenario.catalog.ingredients.map(product => [product.id, [] as DailyStockLot[]]));
  const existing = new Set<string>();
  const add = (lot: Lot, addition: StockAddition) => {
    existing.add(lot.id);
    lotsByProduct.get(lot.productId)!.push({
      reference: lot.id,
      receivedOn: lot.receivedOn,
      expiresOn: lot.expiresOn,
      unitCostCents: lot.unitCost,
      openingMilli: addition === null ? toMilliUnits(lot.quantity) : 0,
      addedMilli: addition === null ? 0 : toMilliUnits(lot.quantity),
      closingMilli: toMilliUnits(closingByReference.get(lot.id)?.quantity ?? 0),
      lossMilli: lossByReference.get(lot.id) ?? 0,
      addition,
      adjustmentOutMilli: adjustmentByReference.get(lot.id) ?? 0,
    });
  };
  for (const lot of scenario.opening?.lots ?? []) add(lot, null);
  for (const purchase of scenario.purchases) {
    if (purchase.receivedOn !== day.date) continue;
    for (const line of purchase.lines) {
      if (line.received > 0) add(receivedLot(purchase.id, line, day.date), "delivery");
    }
  }
  // A closing lot created outside supplier receipts comes from a positive count adjustment.
  for (const lot of day.closingLots) if (!existing.has(lot.id)) add(lot, "adjustment");

  return scenario.catalog.ingredients.map(product => ({
    name: product.name.normalize("NFC"),
    unit: product.unit,
    lots: lotsByProduct.get(product.id)!,
  }));
}
