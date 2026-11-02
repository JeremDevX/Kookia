import type { ImpactBucket, ImpactPeriod } from "../../services/impactService";

export function formatLossValue(count: number, unpriced: number, cost: number, currency: string) {
  if (!count) return "Aucune perte enregistrée";
  if (unpriced >= count) return "Indisponible";
  const value = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cost);
  return `${value}${unpriced ? " · valorisation partielle" : ""}`;
}

export const hasPricedLoss = (bucket: ImpactBucket) => bucket.lossMovementCount > bucket.unpricedLossMovementCount;

export function comparisonValues(period: ImpactPeriod, currency: string) {
  const { recorded: bucket, excluded } = period;
  const days = bucket.serviceDays;
  const incompleteSales = days.partial + days.coverageMissing + days.unregistered > 0;
  const salesKnown = bucket.menuItemUnits > 0 || days.complete > 0 || (days.closed > 0 && !incompleteSales);
  const serviceDaysKnown = days.complete + days.partial + days.coverageMissing + days.closed > 0;
  const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  const lossHasPrice = hasPricedLoss(bucket);
  const lossIncomplete = bucket.unpricedLossMovementCount > 0 || excluded.lossUnitMismatch > 0;
  return {
    sales: salesKnown ? `${bucket.menuItemUnits}${incompleteSales ? " · couverture incomplète" : ""}` : "Aucune donnée de vente",
    losses: lossHasPrice ? `${money(bucket.knownLossCost)}${lossIncomplete ? " · valorisation incomplète" : ""}` :
      lossIncomplete ? "Valorisation indisponible ou incomplète" : "Aucune perte enregistrée",
    receipts: bucket.receiptCount ? `${money(bucket.receivedCost)}${excluded.receiptUnitMismatch ? " · données exclues" : ""}` :
      excluded.receiptUnitMismatch ? "Données de réception exclues" : "Aucune réception enregistrée",
    services: serviceDaysKnown ? `${days.complete}${incompleteSales ? " · calendrier incomplet" : ""}` : "Aucune donnée de service",
  };
}
