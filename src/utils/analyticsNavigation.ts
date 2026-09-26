import { isValidISODate } from "./date";

export const ANALYTICS_RETURN_ANCHORS = ["estimated-outflows-title", "impact-summary-title"] as const;
export type AnalyticsReturnAnchor = typeof ANALYTICS_RETURN_ANCHORS[number];
export interface AnalyticsReturnTarget { from: string; to: string; anchor: AnalyticsReturnAnchor }

export const analyticsReturnTarget = (from: string | null, to: string | null,
  returnAnchor: string | null): AnalyticsReturnTarget | undefined => {
  const anchor = ANALYTICS_RETURN_ANCHORS.find((candidate) => candidate === returnAnchor);
  if (!isValidISODate(from) || !isValidISODate(to) || from > to || !anchor) return undefined;
  return { from, to, anchor };
};

export const receiptDetailsHref = (receiptId: string, from: string, to: string, returnAnchor: AnalyticsReturnAnchor) => {
  const params = new URLSearchParams({ receiptId, from, to, returnAnchor });
  return `/orders?${params}#receipt-${encodeURIComponent(receiptId)}`;
};

export const stockMovementHref = (productId: string, movementId: string, from?: string, to?: string,
  returnAnchor: AnalyticsReturnAnchor = "impact-summary-title") => {
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
