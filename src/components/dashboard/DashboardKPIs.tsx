import { AlertTriangle, Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product, Prediction } from "../../types";
import { getProductStatus } from "../../domain/inventory/product.policies";
import { isActionablePurchasePrediction } from "../../domain/predictions/prediction.policies";

interface Props {
  products: Product[];
  predictions: Prediction[];
  selectedCount: number | null;
  productsReady: boolean;
  predictionsReady: boolean;
}

export default function DashboardKPIs({ products, predictions, selectedCount, productsReady, predictionsReady }: Props) {
  const stockToReview = products.filter((product) => getProductStatus(product) !== "optimal").length;
  const buySuggestions = predictions.filter((prediction) => isActionablePurchasePrediction(prediction)).length;
  const items = [
    { label: "Stocks à surveiller", value: productsReady ? stockToReview : "—", detail: "Produits au seuil ou en dessous", to: "/stocks", icon: AlertTriangle, tone: "sand" },
    { label: "Achats suggérés", value: predictionsReady ? buySuggestions : "—", detail: "Suggestions pour aujourd’hui ou après", to: "/predictions", icon: Package, tone: "blue" },
    { label: "Articles sélectionnés", value: selectedCount ?? "—", detail: "À revoir avant validation", to: "#dashboard-order", icon: ShoppingCart, tone: "sage" },
  ];
  return <div className="kpi-grid">
    {items.map(({ label, value, detail, to, icon: Icon, tone }) => <article className="dashboard-kpi" key={label}>
      <div className="kpi-heading"><span>{label}</span><span className={`kpi-symbol ${tone}`}><Icon size={19} aria-hidden="true" /></span></div>
      <p className="kpi-number">{value}</p>
      <p className="kpi-period">{detail}</p>
      <Link className="kpi-footer" to={to}>Voir {label.toLowerCase()}</Link>
    </article>)}
  </div>;
}
