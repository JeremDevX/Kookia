import { ShoppingCart } from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import { getProductStatus, getProductStatusLabel } from "../../domain/inventory/product.policies";
import { getStockVerificationStatus } from "../../domain/inventory/stockCount.policies";
import type { Product } from "../../types";

interface StockInventoryCardProps {
  product: Product;
  selecting: boolean;
  onInspect: () => void;
  onSelect: () => void;
}

export default function StockInventoryCard({ product, selecting, onInspect, onSelect }: StockInventoryCardProps) {
  const status = getProductStatus(product);
  const verification = getStockVerificationStatus(product);
  const countDescription = verification === "counted"
    ? `Compté : ${product.latestCount?.countedQuantity} ${product.unit}`
    : product.latestCount
      ? `À vérifier · dernier comptage ${product.latestCount.countedQuantity} ${product.unit}`
      : "À vérifier · aucun comptage";

  return <li className="stock-inventory-card">
    <article>
      <header className="stock-inventory-card-heading">
        <h3><button className="product-name stock-product-link" aria-label={`Voir la fiche ${product.name}`} onClick={onInspect}>{product.name}</button></h3>
        <Badge label={getProductStatusLabel(status)} status={status} />
      </header>
      <p className="stock-inventory-category">{product.category}</p>
      <dl className="stock-inventory-details">
        <div><dt>Stock théorique</dt><dd>{product.currentStock} {product.unit}<small>{countDescription}</small></dd></div>
        <div><dt>Seuil</dt><dd>{product.minThreshold} {product.unit}</dd></div>
        <div><dt>Valeur catalogue indicative</dt><dd>{(product.currentStock * product.pricePerUnit).toFixed(2)} €</dd></div>
      </dl>
      <Button size="sm" variant="outline" icon={<ShoppingCart size={14} />} aria-label={`Ajouter ${product.name} à la commande`} disabled={selecting} onClick={onSelect}>Ajouter à la commande</Button>
    </article>
  </li>;
}
