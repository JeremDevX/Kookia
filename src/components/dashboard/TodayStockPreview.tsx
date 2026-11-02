import { Link } from "react-router-dom";
import Badge from "../common/Badge";
import { getProductStatus, getProductStatusLabel } from "../../domain/inventory/product.policies";
import type { Product, ProductStatus } from "../../domain/inventory/product.types";

const priority: Record<ProductStatus, number> = { urgent: 0, moderate: 1, neutral: 2, optimal: 3 };

export default function TodayStockPreview({ products }: { products: Product[] }) {
  const preview = [...products].sort((a, b) => priority[getProductStatus(a)] - priority[getProductStatus(b)] ||
    a.name.localeCompare(b.name, "fr") || a.id.localeCompare(b.id)).slice(0, 3);
  if (preview.length === 0) return null;
  return <ul className="today-stock-products" aria-label="Produits à vérifier en priorité">
    {preview.map((product) => {
      const status = getProductStatus(product);
      const stock = product.currentStock.toLocaleString("fr-FR");
      const threshold = product.minThreshold.toLocaleString("fr-FR");
      return <li key={product.id}>
        <div className="today-stock-product-heading"><Link to={`/stocks?product=${encodeURIComponent(product.id)}`}>{product.name}</Link>
          <Badge status={status} label={getProductStatusLabel(status)} /></div>
        <p>Stock théorique : {stock} {product.unit} · seuil : {threshold} {product.unit}</p>
        {product.minThreshold > 0 && <meter min={0} max={product.minThreshold} value={Math.max(0, Math.min(product.currentStock, product.minThreshold))}
          aria-label={`Stock théorique de ${product.name} par rapport au seuil`} />}
      </li>;
    })}
  </ul>;
}
