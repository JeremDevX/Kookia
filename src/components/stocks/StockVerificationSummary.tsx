import { ClipboardCheck } from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import type { Product } from "../../types";
import { getProductStatus, getProductStatusLabel } from "../../domain/inventory/product.policies";
import { getStockVerificationStatus } from "../../domain/inventory/stockCount.policies";

interface StockVerificationSummaryProps { product: Product; onCount: () => void; }

export default function StockVerificationSummary({ product, onCount }: StockVerificationSummaryProps) {
  const verification = getStockVerificationStatus(product);
  const threshold = getProductStatus(product);
  return <section className="drawer-section">
    <div className="status-banner">
      <Badge label={`Seuil : ${getProductStatusLabel(threshold)}`} status={threshold} />
      <span className="stock-big">
        <span className="block text-xs text-secondary">Stock théorique</span>
        {product.currentStock} <span className="unit">{product.unit}</span>
      </span>
    </div>
    <div className="flex items-center justify-between gap-3 mt-3">
      <div>
        <Badge label={verification === "counted" ? "Compté · inchangé depuis" : "À vérifier"} status={verification === "counted" ? "optimal" : "neutral"} />
        {product.latestCount && <p className="drawer-source mt-1">Dernier comptage : {product.latestCount.countedQuantity} {product.latestCount.unit}, le {product.latestCount.countDate}. Attribution conservée.</p>}
      </div>
      <Button size="sm" variant="outline" icon={<ClipboardCheck size={14} />} onClick={onCount}>Compter</Button>
    </div>
    <small className="drawer-source">Le niveau d’alerte est calculé sur le stock théorique ; il ne confirme pas la quantité physique.</small>
  </section>;
}
