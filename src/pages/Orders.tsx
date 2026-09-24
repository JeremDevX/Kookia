import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import InvoiceModal from "../components/dashboard/InvoiceModal";
import OrderGenerator from "../components/dashboard/OrderGenerator";
import OrderHistory from "../components/dashboard/OrderHistory";
import SourceInvoiceArchive from "../components/dashboard/SourceInvoiceArchive";
import { useCart } from "../context/useCart";
import { useToast } from "../context/ToastContext";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import { createOrderRecommendationsFromCartItems } from "../features/orders/orderRecommendations";
import type { Invoice } from "../services/invoiceService";
import { formatLocalISODate } from "../utils/date";
import "../styles/Workspace.css";
import "./Orders.css";

export default function Orders() {
  const [searchParams] = useSearchParams();
  const { cartItems, loading: cartLoading, removeFromCart, refreshCart } = useCart();
  const { products, loading: catalogLoading, error: catalogError, refetch } = useInventoryCatalog();
  const { addToast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<Invoice | undefined>();
  const [invoiceRefresh, setInvoiceRefresh] = useState(0);
  const recommendations = createOrderRecommendationsFromCartItems(cartItems);
  const missingProduct = cartItems.some((item) => !products.some((product) => product.id === item.productId));
  const hasExampleItem = cartItems.some((item) => !!item.predictionId);
  const openManualInvoice = () => {
    setInvoiceDraft({ id: crypto.randomUUID(), reference: "", date: formatLocalISODate(new Date()),
      lines: [], status: "draft", source: "manual", revision: 0 });
    setInvoiceOpen(true);
  };

  return <div className="orders-container workspace-page">
    <header className="workspace-header"><div>
      <h1>Achats</h1>
      <p className="workspace-subtitle">Choisissez vos produits, revoyez les quantités, puis validez votre commande.</p>
    </div></header>

    <section id="selection" className="orders-selection" aria-labelledby="selection-title">
      <div className="workspace-section-heading"><h2 id="selection-title">Commande en préparation</h2>
        <span>{cartLoading ? "Chargement…" : `${cartItems.length} article${cartItems.length > 1 ? "s" : ""}`}</span>
      </div>
      {catalogError && <div role="alert"><p>Catalogue indisponible : {catalogError.message}</p><Button variant="outline" onClick={() => void refetch()}>Réessayer</Button></div>}
      {missingProduct && !catalogLoading && !catalogError && <p role="alert">Un produit de votre sélection n'est plus dans le catalogue. Retirez-le avant de valider.</p>}
      {hasExampleItem && <p role="alert">Les scénarios d'exemple ne peuvent pas être validés. Écartez-les de la sélection avant de continuer.</p>}
      {cartLoading || catalogLoading ? <p role="status">Chargement de votre commande…</p> : cartItems.length === 0 ?
        <div className="orders-empty"><p>Aucun article sélectionné.</p><Link to="/stocks">Choisir dans les stocks</Link></div> :
        <ul className="orders-selection-list">{cartItems.map((item) => <li key={item.id}>
          <div><strong>{item.productName}</strong><span>{item.quantity} {item.unit} · {item.predictionId ? "scénario d'exemple à écarter" : item.source === "stocks" ? "choisi dans Stocks" : "sélection précédente"}</span></div>
          <Button type="button" variant="outline" size="sm" onClick={() => void removeFromCart(item.id)} disabled={cartLoading}>Écarter</Button>
        </li>)}</ul>}
      {cartItems.length > 0 && <div className="orders-selection-actions"><p>La validation enregistre votre décision. Elle n'envoie rien au fournisseur et ne modifie pas le stock.</p>
        <Button onClick={() => setReviewOpen(true)} disabled={cartLoading || catalogLoading || !!catalogError || missingProduct || hasExampleItem}>Revoir les quantités</Button></div>}
    </section>

    <SourceInvoiceArchive refreshKey={invoiceRefresh} sourceId={searchParams.get("source") ?? undefined}
      onCreateManual={openManualInvoice}
      onOpenDraft={(invoice) => { setInvoiceDraft(invoice); setInvoiceOpen(true); }} />

    <OrderHistory key={historyRevision} />

    <section className="orders-examples" aria-labelledby="orders-examples-title">
      <h2 id="orders-examples-title">Pour aller plus loin</h2>
      <p><Link to="/stocks">Vérifier les stocks</Link> pour choisir un produit réel.</p>
      <p><Link to="/predictions">Explorer les scénarios d'exemple</Link> — uniquement pour comprendre les possibilités futures.</p>
    </section>

    <Modal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Revoir les quantités" width="lg">
      <OrderGenerator recommendations={recommendations} onClose={() => setReviewOpen(false)}
        onValidated={() => { void refreshCart(); setHistoryRevision((value) => value + 1); }} />
    </Modal>
    <Modal isOpen={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Revoir une facture" width="lg">
      <InvoiceModal initialInvoice={invoiceDraft}
        onPersist={() => setInvoiceRefresh((value) => value + 1)}
        onValidate={(invoice) => {
          addToast("success", invoice.source === "source_document" ? "Réception simulée enregistrée" : "Réception enregistrée",
            invoice.source === "source_document" ? "Le scénario de stock a été mis à jour. Aucun achat réel n'a été créé." : "Le stock a été mis à jour.");
          void refetch();
        }} onClose={() => setInvoiceOpen(false)} />
    </Modal>
  </div>;
}
