import { getOrderStep, orderStepLabel } from "../../../shared/orderQuantity.js";
import Button from "../common/Button";
import Badge from "../common/Badge";
import type { Product, Supplier } from "../../types";
import { getProductStatus, getProductStatusLabel, getSuggestedOrderQuantity } from "../../domain/inventory/product.policies";
import { getStockVerificationStatus } from "../../domain/inventory/stockCount.policies";

interface StockReviewProps {
  products: Product[];
  suppliers: Supplier[];
  selecting: boolean;
  onInspect: (id: string) => void;
  onSelect: (product: Product) => void;
}

export default function StockReview({ products, suppliers, selecting, onInspect, onSelect }: StockReviewProps) {
  if (products.length === 0) return <div className="workspace-empty">Aucun produit au seuil bas dans l'inventaire théorique. Les quantités non comptées restent visibles dans Tout l'inventaire.</div>;

  return <div className="stock-review-list">{products.map((product) => {
    const supplier = suppliers.find((item) => item.id === product.supplierId);
    const status = getProductStatus(product);
    return <article className={`stock-review-item stock-review-${status}`} key={product.id}>
      <div><div className="stock-review-heading"><h3>{product.name}</h3><Badge label={getProductStatusLabel(status)} status={status} /></div><p>Stock théorique : {product.currentStock} {product.unit} · seuil : {product.minThreshold} {product.unit}</p>
        <p>{getStockVerificationStatus(product) === "counted" ? `Compté : ${product.latestCount?.countedQuantity} ${product.unit}` : product.latestCount ? `À vérifier · dernier comptage : ${product.latestCount.countedQuantity} ${product.unit}` : "À vérifier · aucun comptage enregistré"}</p>
        <p>Quantité initiale à revoir : {getSuggestedOrderQuantity(product)} {product.unit} (basée sur le seuil, pas sur les ventes). {orderStepLabel(getOrderStep(product), product.unit)}.</p>
        <small>Source : inventaire · Fournisseur : {supplier?.name ?? "non renseigné"}</small></div>
      <div className="stock-review-actions"><Button size="sm" variant="outline" onClick={() => onInspect(product.id)}>Voir la fiche</Button>
        <Button size="sm" disabled={selecting} onClick={() => onSelect(product)}>Ajouter à la commande</Button></div>
    </article>;
  })}</div>;
}
