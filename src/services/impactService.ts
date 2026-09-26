import { apiRequest } from "../config/api";

export interface ImpactProductLoss {
  productId: string; productName: string; unit: string; quantity: number; knownCost: number;
  unpricedMovementCount: number; movementCount: number; operationIds: string[]; movementIds: string[];
}
export interface ImpactReceiptProduct {
  productId: string; productName: string; unit: string; receivedQuantity: number; cost: number;
  receiptIds: string[]; orderIds: string[];
}
export interface ImpactBucket {
  menuItemUnits: number;
  salesByItem: { saleItemId: string; saleItemName: string; quantity: number; operationIds: string[] }[];
  serviceDays: { complete: number; partial: number; coverageMissing: number; closed: number; unregistered: number };
  lossesByProduct: ImpactProductLoss[];
  knownLossCost: number; unpricedLossMovementCount: number; lossMovementCount: number;
  receivedCost: number; receiptCount: number; receiptsByProduct: ImpactReceiptProduct[];
}
export interface ImpactPeriod {
  from: string; to: string; calendarDays: number; recorded: ImpactBucket; simulation: ImpactBucket;
  hasRecordedData: boolean; hasSimulationData: boolean;
  excluded: { simulatedSales: number; simulatedLosses: number; simulatedReceiptLines: number;
    lossUnitMismatch: number; receiptUnitMismatch: number };
}
export interface ImpactMonthlyPeriod {
  month: string; from: string; to: string; calendarDays: number;
  recorded: Pick<ImpactBucket, "menuItemUnits" | "serviceDays" | "lossMovementCount" | "knownLossCost" |
    "unpricedLossMovementCount" | "receivedCost" | "receiptCount">;
  simulation: Pick<ImpactBucket, "menuItemUnits" | "serviceDays" | "lossMovementCount" | "knownLossCost" |
    "unpricedLossMovementCount" | "receivedCost" | "receiptCount">;
  hasRecordedData: boolean; hasSimulationData: boolean;
  excluded: ImpactPeriod["excluded"];
}
export interface ImpactReport {
  from: string; to: string; previous: { from: string; to: string }; comparison: "same_number_of_calendar_days";
  timezone: string; currency: string;
  dateBasis: { sales: string; losses: string; receipts: string };
  unavailableMetrics: string[]; savingsClaim: "not_measured"; generatedAt: string;
  current: ImpactPeriod; prior: ImpactPeriod;
  monthly?: ImpactMonthlyPeriod[];
  monthlyPagination?: { page: number; pageCount: number; totalMonths: number; hasOlder: boolean; hasNewer: boolean };
}

export const getImpactReport = (from: string, to: string, monthlyPage?: number) => {
  const query = new URLSearchParams({ from, to });
  if (monthlyPage !== undefined) {
    query.set("monthly", "true");
    query.set("monthlyPage", String(monthlyPage));
  }
  return apiRequest<ImpactReport>(`/workspace/impact?${query}`);
};
