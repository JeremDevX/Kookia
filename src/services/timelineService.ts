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
}
export interface TimelineResult {
  nextCursor: string | null;
  events: TimelineEvent[];
}

export function getTimeline(from: string, to: string, asOf: string, q: string, signal: AbortSignal, cursor?: string) {
  const params = new URLSearchParams({ from, to, asOf, q, limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return apiRequest<TimelineResult>(`/workspace/timeline?${params}`, { signal });
}
