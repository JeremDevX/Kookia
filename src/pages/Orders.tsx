import { getOrderView, orderViewHref } from "../features/orders/orderNavigation";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import InvoiceModal from "../components/dashboard/InvoiceModal";
import OrderGenerator from "../components/dashboard/OrderGenerator";
import OrderHistory from "../components/dashboard/OrderHistory";
import PurchaseSuggestions from "../components/dashboard/PurchaseSuggestions";
import SourceInvoiceArchive from "../components/dashboard/SourceInvoiceArchive";
import { useCart } from "../context/useCart";
import { useToast } from "../context/ToastContext";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import { createOrderRecommendationsFromCartItems } from "../features/orders/orderRecommendations";
import type { Invoice } from "../services/invoiceService";
import { formatLocalISODate } from "../utils/date";
import { analyticsReturnHref, analyticsReturnTarget } from "../utils/analyticsNavigation";
import "../styles/Workspace.css";
import "./Orders.css";

export default function Orders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const view = getOrderView(searchParams, location.hash);
  const changeView = (next: string) => navigate(orderViewHref(next));
  const focusReceiptId = searchParams.get("receiptId") ?? undefined;
  const returnFrom = searchParams.get("from");
  const returnTo = searchParams.get("to");
  const returnTarget = analyticsReturnTarget(returnFrom, returnTo, searchParams.get("returnAnchor"));
  const returnHref = returnTarget ? analyticsReturnHref(returnTarget.from, returnTarget.to, returnTarget.anchor) : undefined;
  const { cartItems, loading: cartLoading, loadError: cartError, removeFromCart, refreshCart } = useCart();
  const { products, suppliers, loading: catalogLoading, error: catalogError, refetch } = useInventoryCatalog();
  const { addToast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [suggestionsRevision, setSuggestionsRevision] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<Invoice | undefined>();
  const [invoiceRefresh, setInvoiceRefresh] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectionHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (view === "prepare" && location.hash === "#selection") selectionHeadingRef.current?.focus();
  }, [view, location.hash]);
  const recommendations = createOrderRecommendationsFromCartItems(cartItems);
  const missingProduct = !cartError && cartItems.some((item) => !products.some((product) => product.id === item.productId));
  const hasExampleItem = !cartError && cartItems.some((item) => !!item.predictionId);
  const retryCart = () => {
    void refreshCart();
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const retryCatalog = () => {
    void refetch();
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const openManualInvoice = () => {
    setInvoiceDraft({ id: crypto.randomUUID(), reference: "", date: formatLocalISODate(new Date()),
      lines: [], status: "draft", source: "manual", revision: 0 });
    setInvoiceOpen(true);
  };

  return <div className="orders-container workspace-page">
    <header className="workspace-header"><div>
      <h1 ref={headingRef} tabIndex={-1}>{view === "prepare" ? "Préparer mes achats" : "Achats"}</h1>
      <p className="workspace-subtitle">{view === "prepare" ? "Partez des besoins recommandés, ajustez vos quantités puis vérifiez votre sélection." : "Suivez vos commandes et retrouvez vos documents fournisseurs."}</p>
    </div>{view !== "prepare" && <Button onClick={() => changeView("prepare")}>Préparer un achat</Button>}</header>
    <nav className="orders-views" aria-label="Vues des achats">
      {([["orders", "Commandes & réceptions"], ["prepare", "Préparer un achat"], ["invoices", "Factures & documents"]] as const).map(([id, label]) =>
        <Button key={id} variant="outline" aria-pressed={view === id} onClick={() => changeView(id)}>{label}</Button>)}
    </nav>
    {view === "prepare" && <>
    <div className="orders-prepare-intro"><span>1 · Choisir et ajuster</span><span>2 · Valider la sélection</span><span>3 · Transmettre aux fournisseurs</span></div>
    <Link className="orders-selection-shortcut" to="/orders?view=prepare#selection">Voir ma sélection{!cartLoading && !cartError ? ` · ${cartItems.length} article(s)` : ""}</Link>
    <div className="orders-prepare-layout">
    <PurchaseSuggestions refreshKey={suggestionsRevision} />
    <section id="selection" className="orders-selection" aria-labelledby="selection-title">
      <div className="workspace-section-heading"><h2 ref={selectionHeadingRef} id="selection-title" tabIndex={-1}>Ma sélection</h2>
        <span role="status" aria-busy={cartLoading}>
          {cartLoading ? "Chargement…" : cartError ? "Indisponible" : `${cartItems.length} article${cartItems.length > 1 ? "s" : ""}`}
        </span>
      </div>
      {cartError && <div role="alert"><p>La commande en préparation n'a pas pu être chargée : {cartError}</p>
        <Button type="button" variant="outline" onClick={retryCart} disabled={cartLoading}>Réessayer</Button></div>}
      {catalogError && <div role="alert"><p>Catalogue indisponible : {catalogError.message}</p><Button variant="outline" onClick={retryCatalog}>Réessayer</Button></div>}
      {missingProduct && !catalogLoading && !catalogError && <p role="alert">Un produit de votre sélection n'est plus dans le catalogue. Retirez-le avant de valider.</p>}
      {hasExampleItem && <p role="alert">Les propositions sans source enregistrée ne peuvent pas être validées. Retirez-les de la sélection avant de continuer.</p>}
      {cartLoading || catalogLoading ? <p role="status">Chargement de votre commande…</p> : cartError ? null : cartItems.length === 0 ?
        <div className="orders-empty"><strong>Votre liste de courses commence ici</strong><p>Ajoutez les produits recommandés, ou choisissez un autre produit dans vos stocks.</p><Link to="/stocks">Ajouter un autre produit</Link></div> :
        <ul className="orders-selection-list">{cartItems.map((item) => <li key={item.id}>
          <div><strong>{item.productName}</strong><span>{item.quantity} {item.unit} · {item.predictionId ? "proposition à retirer" : item.purchaseSuggestionOperationId ? "issu des recommandations" : item.source === "stocks" ? "choisi dans Stocks" : "sélection précédente"}</span></div>
          <Button type="button" variant="outline" size="sm" aria-label={`Retirer ${item.productName} de ma sélection`} onClick={() => void removeFromCart(item.id)} disabled={cartLoading}>Retirer</Button>
        </li>)}</ul>}
      {!cartError && cartItems.length > 0 && <div className="orders-selection-actions"><div className="orders-selection-total"><span>Budget indicatif HT</span><strong>{catalogLoading || catalogError || missingProduct ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cartItems.reduce((sum, item) => sum + item.quantity * (products.find((p) => p.id === item.productId)?.pricePerUnit ?? 0), 0))}</strong></div><p>La validation enregistre votre décision. Elle n'envoie rien au fournisseur et ne modifie pas le stock.</p>
        <Button onClick={() => setReviewOpen(true)} disabled={cartLoading || catalogLoading || !!catalogError || missingProduct || hasExampleItem}>Vérifier et valider ma sélection</Button></div>}
    </section>

    </div>
    </>}

    {view === "invoices" && <SourceInvoiceArchive refreshKey={invoiceRefresh} sourceId={searchParams.get("source") ?? undefined}
      onCreateManual={openManualInvoice}
      onOpenDraft={(invoice) => { setInvoiceDraft(invoice); setInvoiceOpen(true); }} /> }

    {view === "orders" && <OrderHistory refreshKey={historyRevision} focusReceiptId={focusReceiptId} returnHref={returnHref} returnTarget={returnTarget} onReceiptSaved={() => {
      setInvoiceRefresh((value) => value + 1);
      setSuggestionsRevision((value) => value + 1);
    }} />}

    <p className="orders-help"><Link to="/stocks">Consulter les stocks</Link> · <Link to="/analytics">Voir le bilan des achats réceptionnés</Link></p>

    <Modal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Vérifier ma commande" width="lg">
      <OrderGenerator recommendations={recommendations} products={products} suppliers={suppliers}
        catalogLoading={catalogLoading} catalogError={catalogError} onRetryCatalog={refetch}
        onClose={() => setReviewOpen(false)}
        onValidated={() => { void refreshCart(); setHistoryRevision((value) => value + 1); setSuggestionsRevision((value) => value + 1); }} />
    </Modal>
    <Modal isOpen={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Revoir une facture" width="lg">
      <InvoiceModal initialInvoice={invoiceDraft} products={products} suppliers={suppliers}
        catalogLoading={catalogLoading} catalogError={catalogError} onRetryCatalog={refetch}
        onInvoiceDataChanged={() => setInvoiceRefresh((value) => value + 1)}
        onValidate={(invoice) => {
          addToast("success", invoice.source === "source_document" ? "Pièce rapprochée" : "Réception enregistrée",
            invoice.source === "source_document" ? "La pièce est rapprochée sans créer d'achat ni modifier le stock." : "Le stock a été mis à jour.");
          void refetch();
        }} onClose={() => setInvoiceOpen(false)} />
    </Modal>
  </div>;
}
