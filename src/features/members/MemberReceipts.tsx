import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Button from "../../components/common/Button";
import PurchaseReceiptReview from "../../components/dashboard/PurchaseReceiptReview";
import { getReceiptInvoices } from "../../services/invoiceService";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import "../../styles/Workspace.css";
import "../../pages/Orders.css";

export default function MemberReceipts() {
  const { hash } = useLocation();
  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadedAttempt, setLoadedAttempt] = useState(-1);
  const loading = loadedAttempt !== attempt;
  useEffect(() => {
    let active = true;
    getOrders().then((value) => { if (active) { setOrders(value); setLoadedAttempt(attempt); } }, () => { if (active) { setError("Réceptions indisponibles."); setLoadedAttempt(attempt); } });
    return () => { active = false; };
  }, [attempt]);
  return <div className="member-page orders-container workspace-page"><h1>Réceptions</h1><p>Rapprochez les livraisons des pièces déjà enregistrées.</p>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des réceptions…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" disabled={saving} onClick={() => { setError(""); setOrders(null); setAttempt((value) => value + 1); }}>Réessayer</Button></div> : !orders ? null : orders.length === 0 ? <p>Aucune commande enregistrée.</p> :
      <div className="orders-history">{orders.map((order) => <details key={order.id} id={`order-${order.id}`} className="order-record" open={hash === `#order-${order.id}` ? true : undefined}><summary><strong>{new Date(order.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</strong> · {order.lines.map((line) => line.supplierName).filter((name, index, all) => all.indexOf(name) === index).join(" · ")}{order.status.startsWith("simulated") ? " · simulation" : ""}</summary>
        <div className="order-record-body"><ul>{order.lines.map((line) => <li key={line.id}>{line.productName} · {line.receivedQuantity.toLocaleString("fr-FR")} {line.unit} reçus / {line.quantity.toLocaleString("fr-FR")} {line.unit} commandés</li>)}</ul>
          {order.receipts.map((receipt) => <p key={receipt.id}>Réception enregistrée : {receipt.deliveryReference} · {receipt.deliveryDate}{receipt.simulated ? " · simulation" : ""}</p>)}
          {order.status !== "received" && order.status !== "simulated_received" && <PurchaseReceiptReview order={order} loadReceiptInvoices={getReceiptInvoices} orderStateCurrent={!loading && !error && !saving} onSaved={() => setAttempt((value) => value + 1)} onNotice={setNotice} onSavingChange={setSaving} />}
        </div></details>)}</div>}
  </div>;
}
