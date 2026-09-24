import { apiRequest } from "../config/api";

export interface DailySale {
  id: string; saleItemId: string; saleItemName: string; serviceDate: string;
  quantity: number; source: "manual" | "csv" | "pos" | "demo_simulation"; revision: number;
  createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
}
export type ServiceStatus = "open" | "closed";
export type ServiceCoverage = "complete" | "partial" | "missing";
export interface ServiceDay {
  serviceDate: string; status: ServiceStatus; coverage: ServiceCoverage; source: "recorded" | "demo_simulation" | "mixed"; revision: number;
  actorId: string; salesCount: number; updatedAt: string;
}
export interface LatestService extends ServiceDay { sources: ("manual" | "csv" | "pos" | "demo_simulation")[] }
export interface SaleItem { id: string; name: string }
export interface SaleRecipeMapping {
  id: string; saleItemId: string; recipeId: string; recipeName: string; revision: number;
  effectiveFrom: string; portionsPerItem: number; actorId: string; createdAt: string;
}
export interface SaleRecipeMappingItem {
  id: string; name: string; revision: number; suggestedRecipeId: string | null; mappings: SaleRecipeMapping[];
}
export interface SaleValues { saleItemId: string; serviceDate: string; quantity: number }
export interface SalesMetrics {
  period: { from: string; to: string }; previousPeriod: { from: string; to: string };
  provenance: "recorded_sales" | "demo_simulation" | "mixed"; status: "no_data" | "insufficient_history" | "ready";
  minimumObservedDays: number; observedDays: number; previousObservedDays: number;
  completeServiceDays: number; incompleteServiceDays: number;
  previousCompleteServiceDays: number; previousIncompleteServiceDays: number;
  totalQuantity: number; manualQuantity: number; csvQuantity: number; posQuantity: number; demoSimulationQuantity: number; correctedCsvQuantity: number;
  averagePerObservedDay: number | null; previousAveragePerObservedDay: number | null; changePercent: number | null;
  items: { saleItemId: string; saleItemName: string; quantity: number }[];
  dailyItems: { serviceDate: string; saleItemId: string; saleItemName: string; quantity: number }[];
}

export const getSaleItems = () => apiRequest<SaleItem[]>("/workspace/sales/items");
export const createSaleItem = (name: string) => apiRequest<SaleItem>("/workspace/sales/items", {
  method: "POST", body: JSON.stringify({ name }),
});
export const getSaleRecipeMappings = () => apiRequest<SaleRecipeMappingItem[]>("/workspace/sales/recipe-mappings");
export const createSaleRecipeMapping = (values: {
  saleItemId: string; recipeId: string; expectedRevision: number; operationId: string;
  effectiveFrom: string; portionsPerItem: number;
}) => apiRequest<SaleRecipeMapping & { replayed: boolean }>("/workspace/sales/recipe-mappings", {
  method: "POST", body: JSON.stringify(values),
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
  observedItemCount: number; excludedSimulationRows: number; mixedSourceWindow: boolean;
  items: {
    saleItemId: string; saleItemName: string; forecastQuantity: number;
    backtest: { from: string; to: string; days: number; meanAbsoluteError: number;
      weightedAbsolutePercentageError: number | null };
    recipeProjection:
      | { status: "unmapped"; reason: string }
      | { status: "recipe_version_unknown"; mappingRevision: number; mappingEffectiveFrom: string;
          portionsPerItem: number; reason: string }
      | { status: "mapped"; recipeId: string; recipeName: string; mappingRevision: number;
          mappingEffectiveFrom: string; portionsPerItem: number; recipeVersion: number; recipeEffectiveFrom: string;
          forecastPortions: number; ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }> };
    recipeBacktest: { days: number; mappedDays: number; missingMappingDays: number; missingDatedRecipeDays: number;
      versionsUsed: Array<{ serviceDate: string; mappingRevision: number; mappingEffectiveFrom: string;
        recipeId: string; recipeName: string; recipeVersion: number; recipeEffectiveFrom: string }>;
      ingredients: Array<{ productId: string; productName: string; unit: string; meanAbsoluteError: number;
        weightedAbsolutePercentageError: number | null }> };
  }[];
}
export const getSalesBaseline = () => apiRequest<SalesBaseline>("/workspace/sales/baseline");
export const createSale = (values: SaleValues, operationId: string) => apiRequest<DailySale>("/workspace/sales", {
  method: "POST", body: JSON.stringify({ ...values, operationId }),
});
export const correctSale = (id: string, revision: number, values: SaleValues, operationId: string, reason: string) => apiRequest<DailySale>(
  `/workspace/sales/${encodeURIComponent(id)}`,
  { method: "PATCH", body: JSON.stringify({ ...values, revision, operationId, reason }) },
);

export interface SaleContributionEvent {
  kind: string; actorId: string; reason: string; revision: number; createdAt: string; snapshot: unknown;
}
export interface SaleContribution {
  id: string; source: "manual" | "csv" | "pos" | "demo_simulation"; sourceKey: string; sourceRevision: number;
  importLine: number | null; sourceFileHash: string | null; sourceItemName: string; sourceDate: string;
  sourceRecordId: string | null; sourceExternalItemId: string | null; sourceRefunded: boolean;
  posBatch: { provider: string; batchId: string; from: string; to: string; coverage: "complete" | "partial"; provenance: "recorded_sales" | "demo_simulation" } | null;
  serviceDate: string | null; sourceQuantity: string; quantity: number | null; saleItemId: string | null;
  saleItemName: string | null; status: "pending" | "accepted" | "rejected" | "superseded" | "voided";
  reviewRevision: number; reviewedBy: string | null; reviewedAt: string | null; reviewReason: string | null;
  supersedes: { id: string; source: string; sourceDate: string; sourceItemName: string; sourceQuantity: string } | null;
  currentSale: Pick<DailySale, "id" | "serviceDate" | "quantity" | "revision" | "source"> | null;
  events: SaleContributionEvent[];
}
export const getSaleContributions = (from: string, to: string) => apiRequest<SaleContribution[]>(
  `/workspace/sales/contributions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
);
export const reviewSaleContribution = (id: string, expectedRevision: number,
  decision: "replace" | "keep" | "reject", reason: string, operationId: string, saleItemId?: string) =>
  apiRequest<{ replayed: boolean; status?: string }>(`/workspace/sales/contributions/${encodeURIComponent(id)}/review`, {
    method: "POST", body: JSON.stringify({ expectedRevision, decision, reason, operationId, ...(saleItemId ? { saleItemId } : {}) }),
  });
export const recordSaleOutcome = (id: string, revision: number, action: "void" | "refund", reason: string, operationId: string) =>
  apiRequest<{ replayed: boolean; quantity?: number | null }>(`/workspace/sales/${encodeURIComponent(id)}/${action}`, {
    method: "POST", body: JSON.stringify({ expectedRevision: revision, reason, operationId }),
  });

export interface SalesImportRow {
  line: number; serviceDate: string; itemName: string; quantity: number;
  saleItemId?: string; saleItemName?: string;
  status: "ready" | "invalid" | "unmapped" | "duplicate" | "existing" | "closed";
  message?: string;
}
export interface SalesImportPreview {
  hash: string; alreadyImported: boolean; rows: SalesImportRow[];
  readyCount: number; rejectedCount: number; conflictCount: number;
}
export interface SalesImportResult {
  id: string; alreadyImported: boolean; acceptedCount: number; rejectedCount: number; conflictCount: number;
}
export const previewSalesImport = (csv: string, mapping: Record<string, string>) => apiRequest<SalesImportPreview>(
  "/workspace/sales/imports/preview", { method: "POST", body: JSON.stringify({ csv, mapping }) },
);
export const commitSalesImport = (csv: string, mapping: Record<string, string>, expectedHash: string) => apiRequest<SalesImportResult>(
  "/workspace/sales/imports", { method: "POST", body: JSON.stringify({ csv, mapping, expectedHash }) },
);
