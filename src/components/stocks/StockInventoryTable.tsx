import { ShoppingCart, ClipboardCheck } from "lucide-react";
import Button from "../common/Button";
import { getProductStatus } from "../../domain/inventory/product.policies";
import type { Product } from "../../types";
import StockInventoryStatus from "./StockInventoryStatus";

interface StockInventoryTableProps {
  products: Product[];
  selecting: boolean;
  onInspect: (id: string) => void;
  onSelect: (product: Product) => void;
}

export default function StockInventoryTable({ products, selecting, onInspect, onSelect }: StockInventoryTableProps) {
  return <div className="stocks-table-card">
    <table className="stocks-table" aria-label="Inventaire des produits">
      <thead><tr>
        <th scope="col">Produit</th>
        <th scope="col">Stock théorique</th>
        <th scope="col">Situation</th>
        <th scope="col">Actions</th>
      </tr></thead>
      <tbody>
        {products.map((product) => {
          const status = getProductStatus(product);
          const unverified = status === "neutral";
          return <tr key={product.id} className={`stock-level-${status}`}>
            <td>
              <button className="product-name stock-product-link" aria-label={`Voir la fiche ${product.name}`} onClick={() => onInspect(product.id)}>{product.name}</button>
              <small className="stock-cell-note">{product.category}</small>
            </td>
            <td>
              <span className="stock-quantity"><strong className="stock-value">{product.currentStock.toLocaleString("fr-FR")}</strong><span className="unit">{product.unit}</span></span>
              <small className="stock-cell-note">Seuil : {product.minThreshold.toLocaleString("fr-FR")} {product.unit}</small>
            </td>
            <td><StockInventoryStatus product={product} /></td>
            <td><Button size="sm" variant={unverified || status === "optimal" ? "ghost" : "outline"}
              icon={unverified ? <ClipboardCheck size={16} /> : <ShoppingCart size={16} />}
              aria-label={`${unverified ? "Vérifier" : "Préparer l’achat de"} ${product.name}`}
              disabled={!unverified && selecting}
              onClick={() => unverified ? onInspect(product.id) : onSelect(product)}>{unverified ? "Vérifier" : "Préparer l’achat"}</Button></td>
          </tr>;
        })}
        {products.length === 0 && <tr><td colSpan={4}><div className="workspace-empty">Aucun produit à afficher.</div></td></tr>}
      </tbody>
    </table>
  </div>;
}
