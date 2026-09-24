import { apiRequest } from "../config/api";

export type TimelineProvenance = "source" | "recorded" | "simulation" | "assumption" | "unknown";
export interface TimelineEvent {
  id: string;
  kind: "document" | "stock" | "loss" | "recipe" | "mapping" | "production" | "sale" | "service" | "decision";
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
  from: string;
  to: string;
  asOf: string;
  count: number;
  truncated: boolean;
  events: TimelineEvent[];
}

export const getTimeline = (from: string, to: string, asOf: string) => apiRequest<TimelineResult>(
  `/workspace/timeline?${new URLSearchParams({ from, to, asOf })}`,
);
