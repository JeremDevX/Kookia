export interface PurchaseLot { quantity: number; expiresAt: string | null; }
export interface DatedPurchaseNeed { date: string; slot?: "lunch" | "dinner"; quantity: number; }
export interface PurchaseArrival { date: string; quantity: number; }
const round = (value: number) => Math.round(value * 1000) / 1000;

function shortages(lots: PurchaseLot[], needs: DatedPurchaseNeed[], arrivals: PurchaseArrival[]) {
  const remaining = lots.map((lot) => ({ ...lot }));
  const incoming = arrivals.map((arrival) => ({ ...arrival, added: false }));
  const missing: DatedPurchaseNeed[] = [];
  for (const need of [...needs].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const arrival of incoming) if (!arrival.added && arrival.date <= need.date) {
      remaining.push({ quantity: arrival.quantity, expiresAt: null }); arrival.added = true;
    }
    let quantity = need.quantity;
    for (const lot of remaining.sort((a, b) => (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999"))) {
      if (lot.expiresAt !== null && lot.expiresAt < need.date) continue;
      const used = Math.min(quantity, lot.quantity); lot.quantity = round(lot.quantity - used); quantity = round(quantity - used);
      if (quantity <= 0) break;
    }
    if (quantity > 0) missing.push({ ...need, quantity });
  }
  return missing;
}

/** Read-only FEFO simulation. Neither expiry nor an expected arrival creates a movement. */
export function purchaseAvailability(countedStock: number, lots: PurchaseLot[], needs: DatedPurchaseNeed[],
  arrivals: PurchaseArrival[], fromDate: string, nextDeliveryDate: string) {
  const tracked = round(lots.reduce((sum, lot) => sum + lot.quantity, 0));
  const lotMismatch = tracked > countedStock + .0005;
  const unagedQuantity = round(Math.max(0, countedStock - tracked));
  const inventory = [...lots, ...(unagedQuantity > 0 ? [{ quantity: unagedQuantity, expiresAt: null }] : [])];
  const expiredQuantity = round(lots.filter((lot) => lot.expiresAt !== null && lot.expiresAt < fromDate).reduce((sum, lot) => sum + lot.quantity, 0));
  const qualifiedArrivals = arrivals.filter((arrival) => arrival.date >= fromDate);
  const withoutInbound = shortages(inventory, needs, []);
  const conditional = shortages(inventory, needs, qualifiedArrivals);
  return { lotMismatch, expiredQuantity, usableStock: round(Math.max(0, countedStock - expiredQuantity)),
    unknownExpiryQuantity: round(inventory.filter((lot) => lot.expiresAt === null).reduce((sum, lot) => sum + lot.quantity, 0)),
    netNeed: round(withoutInbound.reduce((sum, need) => sum + need.quantity, 0)),
    conditionalNetNeed: round(conditional.reduce((sum, need) => sum + need.quantity, 0)),
    beforeDeliveryShortage: round(conditional.filter((need) => need.date < nextDeliveryDate).reduce((sum, need) => sum + need.quantity, 0)),
    purchasableNeed: round(conditional.filter((need) => need.date >= nextDeliveryDate).reduce((sum, need) => sum + need.quantity, 0)),
    shortages: conditional };
}
