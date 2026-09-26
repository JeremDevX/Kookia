export const purchasePreparationHref = "/orders?view=prepare#purchase-suggestions-title";

export function orderViewHref(view: string) {
  return view === "prepare" ? purchasePreparationHref : `/orders?view=${view}`;
}

export function getOrderView(searchParams: URLSearchParams, hash: string) {
  if (searchParams.has("source") || hash === "#invoices") return "invoices";
  if (searchParams.has("receiptId") || hash.startsWith("#order-") || hash === "#to-transmit") return "orders";
  if (hash === "#selection" || hash === "#purchase-suggestions-title") return "prepare";
  const view = searchParams.get("view");
  return view === "prepare" || view === "invoices" ? view : "orders";
}
