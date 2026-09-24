import { apiRequest } from "../config/api";

export interface DailySale {
  id: string; saleItemId: string; saleItemName: string; serviceDate: string;
  quantity: number; source: "manual" | "csv" | "demo_simulation"; revision: number;
  createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
}
export type ServiceStatus = "open" | "closed";
export type ServiceCoverage = "complete" | "partial" | "missing";
export interface ServiceDay {
  serviceDate: string; status: ServiceStatus; coverage: ServiceCoverage; revision: number;
  actorId: string; salesCount: number; updatedAt: string;
}
export interface LatestService extends ServiceDay { sources: ("manual" | "csv" | "demo_simulation")[] }
export interface SaleItem { id: string; name: string }
export interface SaleValues { saleItemId: string; serviceDate: string; quantity: number }
export interface SalesMetrics {
  period: { from: string; to: string }; previousPeriod: { from: string; to: string };
  provenance: "recorded_sales" | "demo_simulation" | "mixed"; status: "no_data" | "insufficient_history" | "ready";
  minimumObservedDays: number; observedDays: number; previousObservedDays: number;
  completeServiceDays: number; incompleteServiceDays: number;
  previousCompleteServiceDays: number; previousIncompleteServiceDays: number;
  totalQuantity: number; manualQuantity: number; csvQuantity: number; demoSimulationQuantity: number; correctedCsvQuantity: number;
  averagePerObservedDay: number | null; previousAveragePerObservedDay: number | null; changePercent: number | null;
  items: { saleItemId: string; saleItemName: string; quantity: number }[];
  dailyItems: { serviceDate: string; saleItemId: string; saleItemName: string; quantity: number }[];
}

export const getSaleItems = () => apiRequest<SaleItem[]>("/workspace/sales/items");
export const createSaleItem = (name: string) => apiRequest<SaleItem>("/workspace/sales/items", {
  method: "POST", body: JSON.stringify({ name }),
});

export const getSales = (from: string, to: string) => apiRequest<DailySale[]>(
  `/workspace/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
);
export const getLatestService = () => apiRequest<LatestService | null>("/workspace/sales/latest");
export const getServiceDays = (from: string, to: string) => apiRequest<ServiceDay[]>(
  `/workspace/sales/service-days?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
);
export const saveServiceDay = (day: Pick<ServiceDay, "serviceDate" | "revision" | "status" | "coverage">) =>
  apiRequest<ServiceDay>(`/workspace/sales/service-days/${encodeURIComponent(day.serviceDate)}`, {
    method: "PUT", body: JSON.stringify({ expectedRevision: day.revision, status: day.status, coverage: day.coverage }),
  });
export const getSalesMetrics = (from: string, to: string) => apiRequest<SalesMetrics>(
  `/workspace/sales/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
);
export interface SalesBaseline {
  provenance: "recorded_sales" | "demo_simulation" | "mixed"; model: "rolling_mean_7_v1";
  asOfDate: string; forecastDate: string; historyFrom: string;
  requiredConsecutiveDays: number; lookbackDays: number; evaluationDays: number;
  completeServiceDays: number; openServiceDays: number; incompleteDates: string[];
  status: "no_data" | "insufficient_history" | "experimental";
  observedItemCount: number;
  items: {
    saleItemId: string; saleItemName: string; forecastQuantity: number;
    backtest: { from: string; to: string; days: number; meanAbsoluteError: number;
      weightedAbsolutePercentageError: number | null };
  }[];
}
export const getSalesBaseline = () => apiRequest<SalesBaseline>("/workspace/sales/baseline");
export const createSale = (values: SaleValues, operationId: string) => apiRequest<DailySale>("/workspace/sales", {
  method: "POST", body: JSON.stringify({ ...values, operationId }),
});
export const correctSale = (id: string, revision: number, values: SaleValues) => apiRequest<DailySale>(
  `/workspace/sales/${encodeURIComponent(id)}`,
  { method: "PATCH", body: JSON.stringify({ ...values, revision }) },
);

export interface SalesImportRow {
  line: number; serviceDate: string; itemName: string; quantity: number;
  saleItemId?: string; saleItemName?: string;
  status: "ready" | "invalid" | "unmapped" | "duplicate" | "existing" | "closed";
  message?: string;
}
export interface SalesImportPreview {
  hash: string; alreadyImported: boolean; rows: SalesImportRow[];
  readyCount: number; rejectedCount: number;
}
export interface SalesImportResult {
  id: string; alreadyImported: boolean; acceptedCount: number; rejectedCount: number;
}
export const previewSalesImport = (csv: string, mapping: Record<string, string>) => apiRequest<SalesImportPreview>(
  "/workspace/sales/imports/preview", { method: "POST", body: JSON.stringify({ csv, mapping }) },
);
export const commitSalesImport = (csv: string, mapping: Record<string, string>, expectedHash: string) => apiRequest<SalesImportResult>(
  "/workspace/sales/imports", { method: "POST", body: JSON.stringify({ csv, mapping, expectedHash }) },
);
