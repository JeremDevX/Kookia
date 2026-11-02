import type { StockFilters } from "../../types/callbacks";

export type StockFilterKey = "search" | "category" | "stockView" | "stockStatus" | "stockSupplier" | "stockLevel";

export function readStockFilters(params: URLSearchParams): {
  search: string; category: string; view: "all" | "review"; advanced: StockFilters;
} {
  const status = params.get("stockStatus");
  const level = params.get("stockLevel");
  return {
    search: params.get("search") ?? "",
    category: params.get("category") || "all",
    view: params.get("stockView") === "review" ? "review" : "all",
    advanced: {
      status: status === "neutral" || status === "optimal" || status === "moderate" || status === "urgent" ? status : "all",
      supplier: params.get("stockSupplier") || "all",
      stockLevel: level === "low" || level === "medium" || level === "high" ? level : "all",
    },
  };
}

export function updateStockFilters(params: URLSearchParams, updates: Partial<Record<StockFilterKey, string>>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (!value || (key !== "search" && value === "all")) next.delete(key); else next.set(key, value);
  }
  return next;
}
