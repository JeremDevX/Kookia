import { useEffect, useState } from "react";
import { getOrders, type PurchaseOrder } from "../../services/orderService";

export default function OrderHistory() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getOrders().then((data) => { if (active) setOrders(data); }, () => { if (active) setError("Historique des commandes indisponible."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section aria-label="Historique des commandes">
    <h2>Commandes validées</h2>
    {loading ? <p role="status">Chargement des commandes…</p> : error ? <p role="alert">{error}</p> : orders.length === 0 ? <p>Aucune commande enregistrée.</p> : orders.map((order) => <details key={order.id}>
      <summary>{new Date(order.createdAt).toLocaleString("fr-FR")} · {order.lines.length} article(s) · À transmettre</summary>
      <p>Référence : {order.id}. Aucun envoi automatique.</p>
      <ul>{order.lines.map((line, index) => <li key={index}>{line.productName} · {line.quantity} {line.unit} · {line.supplierName} · {(line.quantity * line.pricePerUnit).toFixed(2)} €</li>)}</ul>
    </details>)}
  </section>;
}
