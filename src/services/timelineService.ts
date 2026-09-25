import { apiRequest } from "../config/api";

export type TimelineProvenance = "source" | "recorded" | "simulation" | "assumption" | "unknown";
export interface TimelineEvent {
  id: string;
  kind: "document" | "stock" | "loss" | "recipe" | "mapping" | "production" | "sale" | "service" |
    "decision" | "purchase_order" | "purchase_receipt";
  effectiveAt: string | null;
  knownAt: string | null;
  recordedAt: string | null;
  label: string;
  detail: string;
  provenance: TimelineProvenance;
  qualifier?: string;
  href?: string;
  replayDecisionId?: string;
}
export interface TimelineResult {
  from: string;
  to: string;
  asOf: string;
  count: number;
  truncated: boolean;
  events: TimelineEvent[];
}

export interface TimelineReplay {
  schemaVersion: 1;
  id: string;
  sourceDecisionId: string;
  sourceDecisionAt: string;
  decision: "purchase_suggestion_added" | "purchase_suggestion_excluded";
  provenance: "recorded_sales" | "demo_simulation" | "mixed";
  workspaceMode: "operational" | "demo";
  model: string;
  asOfDate: string;
  forecastDate: string;
  suggestion: {
    suggestionKey: string;
    productId: string;
    productName: string;
    unit: string;
    status: "ready" | "needs_stock_count" | "covered" | "unit_mismatch";
    canAdd: boolean;
    forecastNeed: number;
    countedStock: number | null;
    countDate: string | null;
    estimatedQuantity: number | null;
    currentUnitPrice: number;
    estimatedCost: number | null;
    reason: string;
  };
  sandboxOutcome: {
    kind: "draft_line" | "excluded";
    quantity: number | null;
    currentUnitPrice: number;
    estimatedCost: number | null;
  };
  revision: number;
  updatedAt: string;
}

export const getTimeline = (from: string, to: string, asOf: string) => apiRequest<TimelineResult>(
  `/workspace/timeline?${new URLSearchParams({ from, to, asOf })}`,
);

export const createTimelineReplay = (decisionId: string) => apiRequest<TimelineReplay>(
  "/workspace/timeline/replays", { method: "POST", body: JSON.stringify({ decisionId }) },
);

export const getTimelineReplay = (id: string) => apiRequest<TimelineReplay>(
  `/workspace/timeline/replays/${encodeURIComponent(id)}`,
);
