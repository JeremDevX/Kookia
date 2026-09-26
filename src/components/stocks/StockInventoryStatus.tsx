import { AlertCircle, Check, CircleHelp } from "lucide-react";
import { getProductStatus } from "../../domain/inventory/product.policies";
import type { Product } from "../../types";

export default function StockInventoryStatus({ product }: { product: Product }) {
  const status = getProductStatus(product);
  const Icon = status === "optimal" ? Check : status === "neutral" ? CircleHelp : AlertCircle;
  const label = { urgent: "En rupture", moderate: "Seuil atteint", optimal: "Stock suffisant", neutral: "À vérifier" }[status];
  return <span className={`inventory-status inventory-status-${status}`}>
    <Icon size={16} aria-hidden="true" />{label}
  </span>;
}
