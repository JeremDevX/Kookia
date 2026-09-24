import { useEffect, useState } from "react";
import Button from "../common/Button";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import PurchaseReceiptReview from "./PurchaseReceiptReview";
import "./OrderHistory.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const orderTotal = (order: PurchaseOrder) => order.lines.reduce((total, line) => total + line.quantity * line.pricePerUnit, 0);

interface OrderHistoryProps { onReceiptSaved?: () => void; }

export default function OrderHistory({ onReceiptSaved }: OrderHistoryProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    getOrders().then((data) => { if (active) { setOrders(data); setError(""); } }, () => { if (active) setError("Historique des commandes indisponible."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const refreshAfterReceipt = () => { setLoading(true); setReload((value) => value + 1); onReceiptSaved?.(); };
  const statusLabel = (status: string) => status === "validated" ? "Validée, à transmettre"
    : status === "partially_received" ? "Réception partielle"
      : status === "received" ? "Entièrement réceptionnée"
        : status === "simulated" ? "Commande simulée"
          : status === "simulated_partially_received" ? "Réception simulée partielle"
            : status === "simulated_received" ? "Commande simulée réceptionnée" : status;

  return <section id="to-transmit" className="orders-history" aria-labelledby="orders-history-title">
    <div className="workspace-section-heading"><h2 id="orders-history-title">Commandes enregistrées</h2><span>{!loading && !error && `${orders.length} commande${orders.length > 1 ? "s" : ""}`}</span></div>
    {loading ? <p role="status">Chargement des commandes…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Réessayer</Button></div> : orders.length === 0 ? <p className="orders-empty">Aucune commande enregistrée. Vos articles sélectionnés restent dans la commande en préparation jusqu'à validation.</p> : orders.map((order) => <details className="order-record" key={order.id}>
      <summary><span className="order-record-main"><strong>{new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</strong><small>{order.lines.length} article{order.lines.length > 1 ? "s" : ""} · {statusLabel(order.status)}</small></span><strong className="order-record-total">{money.format(orderTotal(order))}</strong></summary>
      <div className="order-record-body">
        <p>Référence : {order.id}</p>
        <p>{order.status.startsWith("simulated") ? "Opération de démonstration : aucun achat, envoi ni mouvement de stock réel." : "Prix enregistrés à la validation. Aucun envoi fournisseur."}</p>
        <ul>{order.lines.map((line) => <li key={line.id}><span><strong>{line.productName}</strong><small>{line.supplierName} · {line.quantity} {line.unit} × {money.format(line.pricePerUnit)} · reçu {line.receivedQuantity} {line.unit}, reste {line.remainingQuantity} {line.unit}</small></span><strong>{money.format(line.quantity * line.pricePerUnit)}</strong></li>)}</ul>
        {order.receipts.length > 0 && <section aria-label="Réceptions rapprochées"><h3>Réceptions rapprochées</h3>
          {order.receipts.map((receipt) => <article key={receipt.id}>
            <p><strong>{receipt.deliveryReference}</strong> · facture {receipt.invoiceReference} · {receipt.deliveryDate}
              {receipt.simulated ? " · simulation" : ""} · {receipt.invoiceComplete ? "facture rapprochée" : "facture encore à compléter"}</p>
            <ul>{receipt.lines.filter((line) => line.receivedQuantity > 0).map((line) => <li key={line.id}>
              {line.productName} · {line.receivedQuantity} {line.unit} · prix facture {money.format(line.invoiceUnitPrice)}
              {line.priceDifferenceReason ? ` · écart expliqué : ${line.priceDifferenceReason}` : ""}
            </li>)}</ul>
          </article>)}
        </section>}
        {!order.status.endsWith("received") && <PurchaseReceiptReview order={order} onSaved={refreshAfterReceipt} />}
      </div>
    </details>)}
  </section>;
}
