import type { Product } from "../../types";
import Button from "../common/Button";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

export default function StockCountList({ products, onCount }: { products: Product[]; onCount: (id: string) => void }) {
  return <div className="stocks-table-card stock-count-list" role="region" aria-label="Produits à inventorier — défilement horizontal avec les flèches" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="stocks-table" aria-label="Produits à inventorier">
    <thead><tr><th scope="col">Produit</th><th scope="col">Catégorie</th><th scope="col">Stock théorique</th><th scope="col">Action</th></tr></thead>
    <tbody>{products.map((product) => <tr key={product.id}>
      <th scope="row">{product.name}</th><td>{product.category}</td>
      <td>{product.currentStock.toLocaleString("fr-FR")} {product.unit}</td>
      <td><Button size="sm" variant="outline" aria-label={`Compter ${product.name}`} onClick={() => onCount(product.id)}>Compter</Button></td>
    </tr>)}{products.length === 0 && <tr><td colSpan={4}>Aucun produit à afficher.</td></tr>}</tbody>
  </table></div>;
}
