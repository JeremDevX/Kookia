import Button from "../common/Button";
import type { Product, Supplier } from "../../types";
import { getSuggestedOrderQuantity } from "../../domain/inventory/product.policies";

interface StockReviewProps {
  products: Product[];
  suppliers: Supplier[];
  selecting: boolean;
  onInspect: (id: string) => void;
  onSelect: (product: Product) => void;
}

export default function StockReview({ products, suppliers, selecting, onInspect, onSelect }: StockReviewProps) {
  if (products.length === 0) return <div className="workspace-empty">Aucun produit au seuil bas dans l'inventaire enregistré. Vérifiez les quantités si le catalogue vient d'être créé.</div>;

  return <div className="stock-review-list">{products.map((product) => {
    const supplier = suppliers.find((item) => item.id === product.supplierId);
    return <article className="stock-review-item" key={product.id}>
      <div><h3>{product.name}</h3><p>{product.currentStock} {product.unit} en stock · seuil : {product.minThreshold} {product.unit}</p>
        <p>Quantité initiale à revoir : {getSuggestedOrderQuantity(product)} {product.unit} (basée sur le seuil, pas sur les ventes).</p>
        <small>Source : inventaire · Fournisseur : {supplier?.name ?? "non renseigné"}</small></div>
      <div className="stock-review-actions"><Button size="sm" variant="outline" onClick={() => onInspect(product.id)}>Voir la fiche</Button>
        <Button size="sm" disabled={selecting} onClick={() => onSelect(product)}>Ajouter à la commande</Button></div>
    </article>;
  })}</div>;
}
