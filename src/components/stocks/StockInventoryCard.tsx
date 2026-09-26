import { ShoppingCart, ClipboardCheck } from "lucide-react";
import Button from "../common/Button";
import { getProductStatus } from "../../domain/inventory/product.policies";
import type { Product } from "../../types";
import StockInventoryStatus from "./StockInventoryStatus";

interface StockInventoryCardProps {
  product: Product;
  selecting: boolean;
  onInspect: () => void;
  onSelect: () => void;
}

export default function StockInventoryCard({ product, selecting, onInspect, onSelect }: StockInventoryCardProps) {
  const status = getProductStatus(product);
  const unverified = status === "neutral";
  return <li className={`stock-inventory-card stock-level-${status}`}>
    <article>
      <header className="stock-inventory-card-heading">
        <div>
          <h3><button className="product-name stock-product-link" aria-label={`Voir la fiche ${product.name}`} onClick={onInspect}>{product.name}</button></h3>
          <p className="stock-cell-note">{product.category}</p>
        </div>
        <div className="inventory-card-quantity">
          <span className="stock-quantity" aria-label={`Stock théorique : ${product.currentStock.toLocaleString("fr-FR")} ${product.unit}`}><strong className="stock-value">{product.currentStock.toLocaleString("fr-FR")}</strong><span className="unit">{product.unit}</span></span>
          <small className="stock-cell-note">Seuil : {product.minThreshold.toLocaleString("fr-FR")} {product.unit}</small>
        </div>
      </header>
      <footer className="inventory-card-footer">
        <StockInventoryStatus product={product} />
        <Button size="sm" variant={unverified || status === "optimal" ? "ghost" : "outline"}
          icon={unverified ? <ClipboardCheck size={16} /> : <ShoppingCart size={16} />}
          aria-label={`${unverified ? "Vérifier" : "Préparer l’achat de"} ${product.name}`}
          disabled={!unverified && selecting} onClick={unverified ? onInspect : onSelect}>{unverified ? "Vérifier" : "Préparer l’achat"}</Button>
      </footer>
    </article>
  </li>;
}
