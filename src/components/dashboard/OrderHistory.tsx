import { useClientPresentation } from "../../features/members/workspaceContext";
import PurchaseReconciliation from "./PurchaseReconciliation";
import PurchaseDeliveryReview from "./PurchaseDeliveryReview";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { getOrderHistory, type PurchaseOrder, type PurchaseOrderHistory, type ReceiptStatusFilter } from "../../services/orderService";
import { stockMovementHref, type AnalyticsReturnTarget } from "../../utils/analyticsNavigation";
import PurchaseReceiptReview from "./PurchaseReceiptReview";
import SupplierOrderSheets from "./SupplierOrderSheets";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import "./OrderHistory.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const orderTotal = (order: PurchaseOrder) => order.lines.reduce((total, line) => total + line.quantity * line.pricePerUnit, 0);

function whenOrderInteractive(element: HTMLElement, focus: () => void) {
  const inert = element.closest("[inert]");
  if (!inert) { focus(); return; }
  const observer = new MutationObserver(() => {
    if (element.closest("[inert]")) return;
    observer.disconnect();
    focus();
  });
  observer.observe(inert, { attributes: true, attributeFilter: ["inert"] });
  return () => observer.disconnect();
}

interface OrderHistoryProps { refreshKey?: number; focusReceiptId?: string; returnHref?: string;
  returnTarget?: AnalyticsReturnTarget; onReceiptSaved?: () => void; }

export default function OrderHistory({ refreshKey = 0, focusReceiptId, returnHref, returnTarget, onReceiptSaved }: OrderHistoryProps) {
  const clientPresentation = useClientPresentation();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReceiptStatusFilter>("all");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const revision = `${refreshKey}:${reload}`;
  const orderId = location.hash.startsWith("#order-") ? location.hash.slice(7) : undefined;
  const requestKey = JSON.stringify([revision, page, query, filter, supplier, orderId, focusReceiptId]);
  const [history, setHistory] = useState<PurchaseOrderHistory | null>(null);
  const [error, setError] = useState("");
  const [receiptNotice, setReceiptNotice] = useState("");
  const [savingReceipts, setSavingReceipts] = useState<string[]>([]);
  const [pinnedReceipts, setPinnedReceipts] = useState<PurchaseOrder[]>([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const currentError = loading ? "" : error;
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRead = useRef<"retry" | "page" | null>(null);
  const focusedReceipt = useRef<string | null>(null);
  const focusedOrder = useRef("");
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void getOrderHistory({ page, query, status: filter, supplierId: supplier, orderId, receiptId: focusReceiptId }, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) { setHistory(data); setError(""); setLoadedRequestKey(requestKey); }
        }, () => {
          if (!controller.signal.aborted) { setError("Historique des commandes indisponible."); setLoadedRequestKey(requestKey); }
        });
    };
    const debounce = window.setTimeout(load, query ? 200 : 0);
    return () => { controller.abort(); window.clearTimeout(debounce); };
  }, [filter, focusReceiptId, orderId, page, query, requestKey, supplier]);
  useEffect(() => {
    if (loading || !focusAfterRead.current) return;
    const fromPagination = focusAfterRead.current === "page" && paginationRef.current?.contains(document.activeElement);
    focusAfterRead.current = null;
    if (!fromPagination && document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading]);
  useEffect(() => {
    if (loading || currentError || !focusReceiptId || focusedReceipt.current === focusReceiptId) return;
    const receipt = document.getElementById(`receipt-${focusReceiptId}`);
    if (!(receipt instanceof HTMLElement)) return;
    const heading = receipt.querySelector<HTMLElement>("[data-receipt-heading]");
    if (!heading) return;
    const order = receipt.closest("details");
    if (order instanceof HTMLDetailsElement) order.open = true;
    return whenOrderInteractive(receipt, () => {
      focusedReceipt.current = focusReceiptId;
      receipt.scrollIntoView({ block: "center" });
      heading.focus({ preventScroll: true });
    });
  }, [currentError, focusReceiptId, history, loading]);
  const orders = history?.orders ?? [];
  const targetOrder = history?.targetOrder ?? orders.find((order) => order.id === orderId || order.receipts.some((receipt) => receipt.id === focusReceiptId));
  const visible = [...orders];
  if (targetOrder && !visible.some((order) => order.id === targetOrder.id)) visible.unshift(targetOrder);
  for (const order of pinnedReceipts) {
    if (!visible.some((item) => item.id === order.id)) visible.unshift(order);
  }
  useEffect(() => {
    const focusKey = `${location.search}${location.hash}`;
    if (loading || currentError || !location.hash.startsWith("#order-") || focusedOrder.current === focusKey) return;
    const element = document.getElementById(location.hash.slice(1));
    if (!(element instanceof HTMLDetailsElement)) return;
    element.open = true;
    const review = new URLSearchParams(location.search).get("action") === "receive"
      ? element.querySelector<HTMLDetailsElement>(".purchase-receipt-review") : null;
    if (review) review.open = true;
    const target = review ?? element;
    return whenOrderInteractive(target, () => {
      focusedOrder.current = focusKey;
      target.scrollIntoView({ block: "center" });
      target.querySelector("summary")?.focus({ preventScroll: true });
    });
  }, [loading, currentError, location.hash, location.search, history]);
  const refreshAfterReceipt = () => { setReload((value) => value + 1); onReceiptSaved?.(); };
  const retryHistory = () => {
    if (document.activeElement === retryButtonRef.current) focusAfterRead.current = "retry";
    setReload((value) => value + 1);
  };
  const changePage = (offset: number) => {
    if (!history || loading || currentError) return;
    if (paginationRef.current?.contains(document.activeElement)) focusAfterRead.current = "page";
    setPage(history.page + offset);
  };
  const statusLabel = (status: string) => status === "validated" ? "Validée, à transmettre"
    : status === "partially_received" ? "Réception partielle"
      : status === "received" ? "Entièrement réceptionnée"
        : status === "simulated" ? "Commande non transmise"
          : status === "simulated_partially_received" ? "Réception partielle — stock inchangé"
            : status === "simulated_received" ? "Réception sans ajout au stock" : status;

  return <section id="to-transmit" className="orders-history" aria-labelledby="orders-history-title">
    <div className="workspace-section-heading"><h2 ref={headingRef} id="orders-history-title" tabIndex={-1}>Suivre vos commandes</h2><span>{history && !loading && !currentError && `${history.total} commande${history.total > 1 ? "s" : ""}`}</span></div>
    {receiptNotice && <p role="status">{receiptNotice}</p>}
    {loading && <p role="status">{orders.length > 0 ? "Actualisation des commandes…" : "Chargement des commandes…"}</p>}
    {currentError && <div role="alert"><p>{currentError}</p>
      {orders.length > 0 && <p>Les commandes déjà chargées restent visibles ; leur réception est suspendue jusqu’à une lecture réussie.</p>}
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retryHistory}>Réessayer</Button>
    </div>}
    {focusReceiptId && !loading && !currentError && !visible.some((order) => order.receipts.some((receipt) => receipt.id === focusReceiptId)) &&
      <p role="status">Cette réception n’est plus présente dans l’historique des commandes. {returnHref &&
        <Link to={returnHref}>Retour au Bilan</Link>}</p>}
    {!loading && !currentError && history?.total === 0 && <p className="orders-empty">Aucune commande enregistrée. <Link to="/orders?view=prepare">Préparer votre première commande</Link></p>}
    {history && history.total > 0 && <>
      <div className="orders-kpis">
        <article><span>À réceptionner</span><strong>{history.statusCounts.validated ?? 0}</strong><small>Commandes réelles validées, sans réception</small></article>
        <article><span>Livraisons partielles</span><strong>{history.statusCounts.partially_received ?? 0}</strong><small>Commandes réelles partiellement reçues</small></article>
        <article><span>Réceptionnées</span><strong>{history.statusCounts.received ?? 0}</strong><small>Commandes réelles entièrement reçues</small></article>
      </div>
      <p>Ouvrez une commande pour consulter ses produits, préparer les documents fournisseur ou enregistrer une livraison. La validation ne prouve pas l’envoi au fournisseur.</p>
      <div className="orders-toolbar">
        <label>Rechercher une commande<input type="search" maxLength={200} placeholder="Produit, fournisseur, référence…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label>
        <label>Fournisseur<select value={supplier} onChange={(event) => { setSupplier(event.target.value); setPage(0); }}><option value="">Tous les fournisseurs</option>{history.suppliers.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>État de réception<select value={filter} onChange={(event) => { setFilter(event.target.value as ReceiptStatusFilter); setPage(0); }}><option value="all">Toutes les commandes</option><option value="pending">À réceptionner / partielles</option><option value="received">Entièrement réceptionnées</option></select></label>
        <p role="status">{!loading && !currentError && `${history.filteredCount} résultat(s)`}</p>
      </div>
      {targetOrder && <p>La commande liée au lien ouvert reste affichée, même hors filtre.</p>}
      {!loading && !currentError && history.filteredCount === 0 && <p>Aucune commande ne correspond à ces filtres.</p>}
    </>}
    {visible.map((order) => <details className="order-record" key={order.id} id={`order-${order.id}`} open={location.hash === `#order-${order.id}` ? true : undefined}>
      <summary aria-disabled={savingReceipts.includes(order.id) || undefined}
        onClick={(event) => {
          if (savingReceipts.includes(order.id)) event.preventDefault();
          else if (event.currentTarget.parentElement instanceof HTMLDetailsElement && event.currentTarget.parentElement.open)
            setPinnedReceipts((current) => current.filter((item) => item.id !== order.id));
        }}><span className="order-record-main"><strong>{new Date(order.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</strong><span>{[...new Set(order.lines.map((line) => line.supplierName))].join(" · ")}</span><small>{order.lines.length} article{order.lines.length > 1 ? "s" : ""} · {statusLabel(order.status)}</small></span><strong className="order-record-total">{money.format(orderTotal(order))}</strong></summary>
      <div className="order-record-body">
        {pinnedReceipts.some((item) => item.id === order.id) && !orders.some((item) => item.id === order.id) &&
          <p role="status">Cette commande reste affichée pour conserver le rapprochement.</p>}
        <p>Référence : {order.id}</p>
        <p>{order.status.startsWith("simulated") ? "Aucun achat ni envoi fournisseur n’a été confirmé et le stock n’a pas changé." : "Prix enregistrés à la validation. Aucun envoi fournisseur."}</p>
        <div className="orders-table-wrap" role="region" aria-label="Produits de la commande — défilement horizontal avec les flèches" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
          <table className="orders-table"><thead><tr><th scope="col">Produit / fournisseur</th><th scope="col">Commandé</th><th scope="col">Reçu</th><th scope="col">Reste à recevoir</th><th scope="col">Montant</th></tr></thead>
            <tbody>{order.lines.map((line) => <tr key={line.id}><th scope="row">{line.productName}<small>{line.supplierName} · {money.format(line.pricePerUnit)} / {line.unit}</small></th>
              <td>{line.quantity} {line.unit}</td><td>{line.receivedQuantity} {line.unit}</td><td>{line.remainingQuantity} {line.unit}<small>Attendu : {line.expectedDeliveryDate ?? "date à confirmer"}{line.deliveryNote ? ` · ${line.deliveryNote}` : ""}</small></td><td>{money.format(line.quantity * line.pricePerUnit)}</td></tr>)}</tbody>
          </table>
        </div>
        {history && <PurchaseReconciliation key={`${order.id}:${revision}`} orderId={order.id} restaurantId={history.restaurantId}
          disabled={loading || Boolean(currentError)} />}
        {order.status === "validated" && <SupplierOrderSheets order={order} />}
        {["validated", "partially_received"].includes(order.status) && <PurchaseDeliveryReview order={order} disabled={loading || Boolean(currentError)} onSaved={refreshAfterReceipt} />}
        {order.receipts.length > 0 && <section aria-label="Réceptions rapprochées"><h3>Réceptions rapprochées</h3>
          {order.receipts.map((receipt) => <article key={receipt.id} id={`receipt-${receipt.id}`} className="order-receipt">
            <h4 data-receipt-heading tabIndex={-1}>{receipt.deliveryReference}</h4>
            {receipt.id === focusReceiptId && returnHref && <p><Link to={returnHref}>Retour au Bilan (même période)</Link></p>}
            <p>Facture {receipt.invoiceReference} · {receipt.deliveryDate}
              {receipt.simulated && !clientPresentation ? " · hors bilan" : ""} · {receipt.invoiceComplete ? "facture rapprochée" : "facture encore à compléter"}</p>
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
          orderStateCurrent={!loading && !currentError} onSaved={() => {
            setPinnedReceipts((current) => current.filter((item) => item.id !== order.id));
            refreshAfterReceipt();
          }} onNotice={setReceiptNotice} onSavingChange={(saving) => {
            if (saving) setPinnedReceipts((current) => current.some((item) => item.id === order.id) ? current : [...current, order]);
            setSavingReceipts((current) => saving ? [...current, order.id] : current.filter((id) => id !== order.id));
          }} />}
      </div>
    </details>)}
    {history && history.pageCount > 1 && <nav ref={paginationRef} className="orders-pagination" aria-label="Pages des commandes">
      <Button variant="outline" disabled={history.page === 0 || loading || !!currentError} onClick={() => changePage(-1)}>Précédent</Button>
      <span role="status">Page {history.page + 1} sur {history.pageCount}</span>
      <Button variant="outline" disabled={history.page + 1 >= history.pageCount || loading || !!currentError} onClick={() => changePage(1)}>Suivant</Button>
    </nav>}
  </section>;
}
