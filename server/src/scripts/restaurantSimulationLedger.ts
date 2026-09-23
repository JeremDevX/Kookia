import type { StockUnit } from "./restaurantSimulationCatalog.js";

interface LedgerMovement {
  productId: string;
  delta: number;
  operationId: string;
  at: string;
}

interface LedgerProduct { id: string; unit: StockUnit; }

const round = (value: number) => Math.round(value * 1000) / 1000;

export function auditMovements(movements: LedgerMovement[], products: LedgerProduct[]) {
  const units = new Map(products.map((product) => [product.id, product.unit]));
  const balances = new Map<string, number>();
  const byDay = new Map<string, Map<string, { opening: number; delta: number }>>();
  for (const movement of [...movements].sort((a, b) => a.at.localeCompare(b.at) || a.operationId.localeCompare(b.operationId))) {
    if (units.get(movement.productId) === "pcs" && !Number.isInteger(movement.delta)) {
      throw new Error(`Mouvement fractionnaire en pièces : ${movement.operationId}`);
    }
    const opening = balances.get(movement.productId) ?? 0;
    const balance = round(opening + movement.delta);
    if (balance < -0.0005) throw new Error(`Stock négatif (${balance}) pour ${movement.productId} au ${movement.at.slice(0, 10)}.`);
    balances.set(movement.productId, balance);
    const date = movement.at.slice(0, 10);
    const daily = byDay.get(date) ?? new Map<string, { opening: number; delta: number }>();
    const productDay = daily.get(movement.productId) ?? { opening, delta: 0 };
    productDay.delta = round(productDay.delta + movement.delta);
    daily.set(movement.productId, productDay);
    byDay.set(date, daily);
  }
  const dailyBalances = new Map<string, number>();
  for (const [date, daily] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const [productId, { opening, delta }] of daily) {
      const closing = round(opening + delta);
      if (closing < -0.0005 || !Number.isFinite(delta) ||
        Math.abs(opening - (dailyBalances.get(productId) ?? 0)) > 0.0005) {
        throw new Error(`Contrôle journalier invalide pour ${productId} le ${date}.`);
      }
      dailyBalances.set(productId, closing);
    }
  }
  for (const product of products) if (Math.abs((balances.get(product.id) ?? 0) - (dailyBalances.get(product.id) ?? 0)) > 0.0005) {
    throw new Error(`Stock de clôture incohérent pour ${product.id}.`);
  }
  return Object.fromEntries(balances);
}
