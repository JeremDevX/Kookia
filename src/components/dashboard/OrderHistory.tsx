import { useEffect, useState } from "react";
import Button from "../common/Button";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import "./OrderHistory.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const orderTotal = (order: PurchaseOrder) => order.lines.reduce((total, line) => total + line.quantity * line.pricePerUnit, 0);

export default function OrderHistory() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    getOrders().then((data) => { if (active) { setOrders(data); setError(""); } }, () => { if (active) setError("Historique des commandes indisponible."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  return <section className="orders-history" aria-labelledby="orders-history-title">
    <div className="workspace-section-heading"><h2 id="orders-history-title">Historique des validations</h2><span>{!loading && !error && `${orders.length} commande${orders.length > 1 ? "s" : ""}`}</span></div>
    {loading ? <p role="status">Chargement des commandes…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Réessayer</Button></div> : orders.length === 0 ? <p className="orders-empty">Aucune commande validée pour le moment. Les sélections non validées restent dans le panier.</p> : orders.map((order) => <details className="order-record" key={order.id}>
      <summary><span className="order-record-main"><strong>{new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</strong><small>{order.lines.length} article{order.lines.length > 1 ? "s" : ""} · Validée, à transmettre</small></span><strong className="order-record-total">{money.format(orderTotal(order))}</strong></summary>
      <div className="order-record-body">
        <p>Référence : {order.id}</p>
        <p>Montant calculé avec les prix enregistrés lors de la validation. Aucun envoi automatique au fournisseur et aucune entrée en stock.</p>
        <ul>{order.lines.map((line, index) => <li key={index}><span><strong>{line.productName}</strong><small>{line.supplierName} · {line.quantity} {line.unit} × {money.format(line.pricePerUnit)}</small></span><strong>{money.format(line.quantity * line.pricePerUnit)}</strong></li>)}</ul>
      </div>
    </details>)}
  </section>;
}
