import { isValidISODate } from "./date";

const returnAnchors = { estimates: "estimated-outflows-title", overview: "impact-summary-title" } as const;
export type AnalyticsReturnAnchor = typeof returnAnchors[keyof typeof returnAnchors];
export interface AnalyticsReturnTarget { from: string; to: string; anchor: AnalyticsReturnAnchor }

const analyticsViews = [
  ["overview", "Vue d’ensemble"],
  ["sales", "Ventes"],
  ["estimates", "Sorties estimées"],
  ["predictions", "Prévisions"],
] as const;
export type AnalyticsView = typeof analyticsViews[number][0];

export function getAnalyticsView(params: URLSearchParams, hash: string): Exclude<AnalyticsView, "predictions"> {
  if (hash === `#${returnAnchors.estimates}`) return "estimates";
  if (hash === `#${returnAnchors.overview}`) return "overview";
  const view = params.get("view");
  return view === "sales" || view === "estimates" ? view : "overview";
}

export function analyticsViewLinks(period: URLSearchParams) {
  return analyticsViews.map(([id, label]) => {
    if (id === "predictions") return { id, label, href: `/predictions${period.size ? `?${period}` : ""}` };
    const query = new URLSearchParams(period);
    query.set("view", id);
    return { id, label, href: `/analytics?${query}` };
  });
}

export const analyticsReturnTarget = (from: string | null, to: string | null,
  returnAnchor: string | null): AnalyticsReturnTarget | undefined => {
  const anchor = Object.values(returnAnchors).find((candidate) => candidate === returnAnchor);
  if (!isValidISODate(from) || !isValidISODate(to) || from > to || !anchor) return undefined;
  return { from, to, anchor };
};

export const receiptDetailsHref = (receiptId: string, from: string, to: string, returnAnchor: AnalyticsReturnAnchor) => {
  const params = new URLSearchParams({ receiptId, from, to, returnAnchor });
  return `/orders?${params}#receipt-${encodeURIComponent(receiptId)}`;
};

export const stockMovementHref = (productId: string, movementId: string, from?: string, to?: string,
  returnAnchor: AnalyticsReturnAnchor = returnAnchors.overview) => {
  const params = new URLSearchParams({ product: productId, movement: movementId });
  const target = analyticsReturnTarget(from ?? null, to ?? null, returnAnchor);
  if (target) {
    params.set("returnFrom", target.from);
    params.set("returnTo", target.to);
    params.set("returnAnchor", target.anchor);
  }
  return `/stocks?${params}#stock-movement-${encodeURIComponent(movementId)}`;
};

export const analyticsReturnHref = (from: string | null, to: string | null, returnAnchor: string | null) => {
  const target = analyticsReturnTarget(from, to, returnAnchor);
  return target ? `/analytics?${new URLSearchParams({ from: target.from, to: target.to })}#${target.anchor}` : undefined;
};
