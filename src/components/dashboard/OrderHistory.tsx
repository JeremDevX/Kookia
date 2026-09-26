import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import { stockMovementHref, type AnalyticsReturnTarget } from "../../utils/analyticsNavigation";
import PurchaseReceiptReview from "./PurchaseReceiptReview";
import SupplierOrderSheets from "./SupplierOrderSheets";
import "./OrderHistory.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const orderTotal = (order: PurchaseOrder) => order.lines.reduce((total, line) => total + line.quantity * line.pricePerUnit, 0);

interface OrderHistoryProps { refreshKey?: number; focusReceiptId?: string; returnHref?: string;
  returnTarget?: AnalyticsReturnTarget; onReceiptSaved?: () => void; }

export default function OrderHistory({ refreshKey = 0, focusReceiptId, returnHref, returnTarget, onReceiptSaved }: OrderHistoryProps) {
  const [reload, setReload] = useState(0);
  const requestKey = `${refreshKey}:${reload}`;
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState("");
  const [receiptNotice, setReceiptNotice] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const currentError = loading ? "" : error;
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  const focusedReceipt = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    getOrders().then((data) => {
      if (active) { setOrders(data); setError(""); setLoadedRequestKey(requestKey); }
    }, () => {
      if (active) { setError("Historique des commandes indisponible."); setLoadedRequestKey(requestKey); }
    });
    return () => { active = false; };
  }, [requestKey]);
  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading, orders]);
  useEffect(() => {
    if (loading || currentError || !focusReceiptId || focusedReceipt.current === focusReceiptId) return;
    const receipt = document.getElementById(`receipt-${focusReceiptId}`);
    if (!(receipt instanceof HTMLElement)) return;
    const heading = receipt.querySelector<HTMLElement>("[data-receipt-heading]");
    if (!heading) return;
    const order = receipt.closest("details");
    if (order instanceof HTMLDetailsElement) order.open = true;
    focusedReceipt.current = focusReceiptId;
    requestAnimationFrame(() => {
      receipt.scrollIntoView({ block: "center" });
      heading.focus({ preventScroll: true });
    });
  }, [currentError, focusReceiptId, loading, orders]);
  const refreshAfterReceipt = () => { setReload((value) => value + 1); onReceiptSaved?.(); };
  const retryHistory = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setReload((value) => value + 1);
  };
  const statusLabel = (status: string) => status === "validated" ? "Validée, à transmettre"
    : status === "partially_received" ? "Réception partielle"
      : status === "received" ? "Entièrement réceptionnée"
        : status === "simulated" ? "Commande non transmise"
          : status === "simulated_partially_received" ? "Réception partielle — stock inchangé"
            : status === "simulated_received" ? "Réception sans ajout au stock" : status;

  return <section id="to-transmit" className="orders-history" aria-labelledby="orders-history-title">
    <div className="workspace-section-heading"><h2 ref={headingRef} id="orders-history-title" tabIndex={-1}>Commandes enregistrées</h2><span>{!loading && !currentError && `${orders.length} commande${orders.length > 1 ? "s" : ""}`}</span></div>
    {receiptNotice && <p role="status">{receiptNotice}</p>}
    {loading && <p role="status">{orders.length > 0 ? "Actualisation des commandes…" : "Chargement des commandes…"}</p>}
    {currentError && <div role="alert"><p>{currentError}</p>
      {orders.length > 0 && <p>Les commandes déjà chargées restent visibles ; leur réception est suspendue jusqu’à une lecture réussie.</p>}
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryHistory}>Réessayer</Button>
    </div>}
    {focusReceiptId && !loading && !currentError && !orders.some((order) => order.receipts.some((receipt) => receipt.id === focusReceiptId)) &&
      <p role="status">Cette réception n’est plus présente dans l’historique des commandes. {returnHref &&
        <Link to={returnHref}>Retour au Bilan</Link>}</p>}
    {!loading && !currentError && orders.length === 0 && <p className="orders-empty">Aucune commande enregistrée. Vos articles sélectionnés restent dans la commande en préparation jusqu'à validation.</p>}
    {orders.map((order) => <details className="order-record" key={order.id} id={`order-${order.id}`}>
      <summary><span className="order-record-main"><strong>{new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</strong><small>{order.lines.length} article{order.lines.length > 1 ? "s" : ""} · {statusLabel(order.status)}</small></span><strong className="order-record-total">{money.format(orderTotal(order))}</strong></summary>
      <div className="order-record-body">
        <p>Référence : {order.id}</p>
        <p>{order.status.startsWith("simulated") ? "Aucun achat ni envoi fournisseur n’a été confirmé et le stock n’a pas changé." : "Prix enregistrés à la validation. Aucun envoi fournisseur."}</p>
        <ul>{order.lines.map((line) => <li key={line.id}><span><strong>{line.productName}</strong><small>{line.supplierName} · {line.quantity} {line.unit} × {money.format(line.pricePerUnit)} · reçu {line.receivedQuantity} {line.unit}, reste {line.remainingQuantity} {line.unit}</small></span><strong>{money.format(line.quantity * line.pricePerUnit)}</strong></li>)}</ul>
        {order.status === "validated" && <SupplierOrderSheets order={order} />}
        {order.receipts.length > 0 && <section aria-label="Réceptions rapprochées"><h3>Réceptions rapprochées</h3>
          {order.receipts.map((receipt) => <article key={receipt.id} id={`receipt-${receipt.id}`} className="order-receipt">
            <h4 data-receipt-heading tabIndex={-1}>{receipt.deliveryReference}</h4>
            {receipt.id === focusReceiptId && returnHref && <p><Link to={returnHref}>Retour au Bilan (même période)</Link></p>}
            <p>Facture {receipt.invoiceReference} · {receipt.deliveryDate}
              {receipt.simulated ? " · hors bilan" : ""} · {receipt.invoiceComplete ? "facture rapprochée" : "facture encore à compléter"}</p>
            <ul>{receipt.lines.filter((line) => line.receivedQuantity > 0).map((line) => <li key={line.id}>
              <span>{line.productName} · {line.receivedQuantity} {line.unit} · prix facture {money.format(line.invoiceUnitPrice)}
                {line.priceDifferenceReason ? ` · écart expliqué : ${line.priceDifferenceReason}` : ""}
                {line.stockMovementId && <Link to={stockMovementHref(line.productId, line.stockMovementId,
                  returnTarget?.from, returnTarget?.to, returnTarget?.anchor)}
                  aria-label={`Voir le mouvement de stock de ${line.productName} dans Stocks`}>Voir le mouvement dans Stocks</Link>}
              </span>
            </li>)}</ul>
          </article>)}
        </section>}
        {order.status !== "received" && order.status !== "simulated_received" && <PurchaseReceiptReview order={order}
          orderStateCurrent={!loading && !currentError} onSaved={refreshAfterReceipt} onNotice={setReceiptNotice} />}
      </div>
    </details>)}
  </section>;
}
