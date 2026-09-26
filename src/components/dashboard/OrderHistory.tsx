import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import { stockMovementHref, type AnalyticsReturnTarget } from "../../utils/analyticsNavigation";
import PurchaseReceiptReview from "./PurchaseReceiptReview";
import SupplierOrderSheets from "./SupplierOrderSheets";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import "./OrderHistory.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const orderTotal = (order: PurchaseOrder) => order.lines.reduce((total, line) => total + line.quantity * line.pricePerUnit, 0);

interface OrderHistoryProps { refreshKey?: number; focusReceiptId?: string; returnHref?: string;
  returnTarget?: AnalyticsReturnTarget; onReceiptSaved?: () => void; }

export default function OrderHistory({ refreshKey = 0, focusReceiptId, returnHref, returnTarget, onReceiptSaved }: OrderHistoryProps) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
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
  const focusedOrder = useRef("");
  useEffect(() => {
    let active = true;
    getOrders().then((data) => {
      if (active) { setOrders(data); setPage(0); setError(""); setLoadedRequestKey(requestKey); }
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
  const targetOrder = orders.find((order) => location.hash === `#order-${order.id}` || order.receipts.some((receipt) => receipt.id === focusReceiptId));
  const filtered = orders.filter((order) => (filter === "all" || (filter === "pending" ? order.status === "validated" || order.status === "partially_received" : order.status === "received")) &&
    `${order.id} ${order.lines.map((line) => `${line.productName} ${line.supplierName}`).join(" ")} ${order.receipts.map((receipt) => `${receipt.deliveryReference} ${receipt.invoiceReference}`).join(" ")}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visible = filtered.slice(page * 10, (page + 1) * 10);
  if (targetOrder && !visible.some((order) => order.id === targetOrder.id)) visible.unshift(targetOrder);
  useEffect(() => {
    if (loading || currentError || !location.hash.startsWith("#order-") || focusedOrder.current === location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    if (!(element instanceof HTMLDetailsElement)) return;
    focusedOrder.current = location.hash;
    element.open = true;
    element.scrollIntoView({ block: "center" });
    element.querySelector("summary")?.focus({ preventScroll: true });
  }, [loading, currentError, location.hash, orders]);
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
    <div className="workspace-section-heading"><h2 ref={headingRef} id="orders-history-title" tabIndex={-1}>Suivre vos commandes</h2><span>{!loading && !currentError && `${orders.length} commande${orders.length > 1 ? "s" : ""}`}</span></div>
    {receiptNotice && <p role="status">{receiptNotice}</p>}
    {loading && <p role="status">{orders.length > 0 ? "Actualisation des commandes…" : "Chargement des commandes…"}</p>}
    {currentError && <div role="alert"><p>{currentError}</p>
      {orders.length > 0 && <p>Les commandes déjà chargées restent visibles ; leur réception est suspendue jusqu’à une lecture réussie.</p>}
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryHistory}>Réessayer</Button>
    </div>}
    {focusReceiptId && !loading && !currentError && !orders.some((order) => order.receipts.some((receipt) => receipt.id === focusReceiptId)) &&
      <p role="status">Cette réception n’est plus présente dans l’historique des commandes. {returnHref &&
        <Link to={returnHref}>Retour au Bilan</Link>}</p>}
    {!loading && !currentError && orders.length === 0 && <p className="orders-empty">Aucune commande enregistrée. <Link to="/orders?view=prepare">Préparer votre première commande</Link></p>}
    {!loading && !currentError && orders.length > 0 && <>
      <div className="orders-kpis">
        <article><span>À réceptionner</span><strong>{orders.filter((order) => order.status === "validated").length}</strong><small>Commandes validées, sans réception</small></article>
        <article><span>Livraisons partielles</span><strong>{orders.filter((order) => order.status === "partially_received").length}</strong><small>Des quantités restent à recevoir</small></article>
        <article><span>Réceptionnées</span><strong>{orders.filter((order) => order.status === "received").length}</strong><small>Livraisons entièrement enregistrées</small></article>
      </div>
      <p>Ouvrez une commande pour consulter ses produits, préparer les documents fournisseur ou enregistrer une livraison. La validation ne prouve pas l’envoi au fournisseur.</p>
      <div className="orders-toolbar">
        <label>Rechercher une commande<input type="search" placeholder="Produit, fournisseur, référence…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label>
        <label>État de réception<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">Toutes les commandes</option><option value="pending">À réceptionner / partielles</option><option value="received">Entièrement réceptionnées</option></select></label>
        <p role="status">{filtered.length} résultat(s)</p>
      </div>
      {targetOrder && <p>La commande liée au lien ouvert reste affichée, même hors filtre.</p>}
      {!filtered.length && <p>Aucune commande ne correspond à ces filtres.</p>}
    </>}
    {visible.map((order) => <details className="order-record" key={order.id} id={`order-${order.id}`} open={location.hash === `#order-${order.id}` ? true : undefined}>
      <summary><span className="order-record-main"><strong>{new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</strong><span>{[...new Set(order.lines.map((line) => line.supplierName))].join(" · ")}</span><small>{order.lines.length} article{order.lines.length > 1 ? "s" : ""} · {statusLabel(order.status)}</small></span><strong className="order-record-total">{money.format(orderTotal(order))}</strong></summary>
      <div className="order-record-body">
        <p>Référence : {order.id}</p>
        <p>{order.status.startsWith("simulated") ? "Aucun achat ni envoi fournisseur n’a été confirmé et le stock n’a pas changé." : "Prix enregistrés à la validation. Aucun envoi fournisseur."}</p>
        <div className="orders-table-wrap" role="region" aria-label="Produits de la commande — défilement horizontal avec les flèches" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
          <table className="orders-table"><thead><tr><th scope="col">Produit / fournisseur</th><th scope="col">Commandé</th><th scope="col">Reçu</th><th scope="col">Reste à recevoir</th><th scope="col">Montant</th></tr></thead>
            <tbody>{order.lines.map((line) => <tr key={line.id}><th scope="row">{line.productName}<small>{line.supplierName} · {money.format(line.pricePerUnit)} / {line.unit}</small></th>
              <td>{line.quantity} {line.unit}</td><td>{line.receivedQuantity} {line.unit}</td><td>{line.remainingQuantity} {line.unit}</td><td>{money.format(line.quantity * line.pricePerUnit)}</td></tr>)}</tbody>
          </table>
        </div>
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
    {filtered.length > 10 && <nav className="orders-pagination" aria-label="Pages des commandes">
      <Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Précédent</Button>
      <span role="status">Page {page + 1} sur {Math.ceil(filtered.length / 10)}</span>
      <Button variant="outline" disabled={(page + 1) * 10 >= filtered.length} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
    </nav>}
  </section>;
}
