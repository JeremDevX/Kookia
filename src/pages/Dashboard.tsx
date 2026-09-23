import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import InvoiceModal from "../components/dashboard/InvoiceModal";
import MenuIdeasModal from "../components/dashboard/MenuIdeasModal";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/useCart";
import { getProductStatus } from "../domain/inventory/product.policies";
import { useProducts } from "../hooks";
import { getSales, type DailySale } from "../services/salesService";
import { formatLocalISODate } from "../utils/date";
import "./Dashboard.css";

export default function Dashboard() {
  const today = formatLocalISODate(new Date());
  const thirtyDaysAgo = new Date(Date.parse(today) - 29 * 86_400_000).toISOString().slice(0, 10);
  const { addToast } = useToast();
  const { cartItems, loading: cartLoading } = useCart();
  const { products, loading: productsLoading, error: productsError, refetch: refreshProducts } = useProducts();
  const [sales, setSales] = useState<DailySale[] | null>(null);
  const [salesError, setSalesError] = useState("");
  const [salesReload, setSalesReload] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const stockToReview = products.filter((product) => getProductStatus(product) !== "optimal");
  const latestSale = sales?.[0];
  const hasExampleItem = cartItems.some((item) => !!item.predictionId);

  useEffect(() => {
    let active = true;
    getSales(thirtyDaysAgo, today).then(
      (rows) => { if (active) { setSales(rows); setSalesError(""); } },
      () => { if (active) setSalesError("Les ventes enregistrées ne sont pas disponibles."); },
    );
    return () => { active = false; };
  }, [salesReload, thirtyDaysAgo, today]);

  const focus = !cartLoading && cartItems.length > 0
    ? hasExampleItem
      ? { title: "Corrigez votre sélection", detail: "Un ancien scénario d'exemple doit être écarté avant la validation.", to: "/orders#selection", action: "Ouvrir la sélection" }
      : { title: "Une commande attend votre validation", detail: `${cartItems.length} article${cartItems.length > 1 ? "s" : ""} à revoir.`, to: "/orders#selection", action: "Revoir les quantités" }
    : salesError
      ? { title: "Vérifiez vos ventes", detail: "Leur état n'a pas pu être chargé.", to: "/sales", action: "Ouvrir les ventes" }
      : sales === null
        ? { title: "Retrouvez vos données", detail: "Vos ventes et vos stocks sont en cours de chargement.", to: "/sales", action: "Ouvrir les ventes" }
        : sales.length === 0
          ? { title: "Ajoutez des ventes récentes", detail: "Aucune vente sur les 30 derniers jours. Importez un CSV Kookia ou saisissez le dernier service.", to: "/sales#sales-start", action: "Ajouter des ventes" }
          : productsError
            ? { title: "Vérifiez votre stock", detail: "L'inventaire n'a pas pu être chargé.", to: "/stocks", action: "Ouvrir les stocks" }
            : productsLoading
              ? { title: "Retrouvez vos données", detail: "L'inventaire est en cours de chargement.", to: "/stocks", action: "Ouvrir les stocks" }
              : stockToReview.length > 0
                ? { title: "Vérifiez les stocks à surveiller", detail: `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} au seuil ou en dessous, selon les quantités enregistrées.`, to: "/stocks", action: "Voir les stocks" }
                : { title: "Aucune alerte de stock enregistrée", detail: "Vérifiez les ventes du dernier service ou préparez vos prochains achats.", to: "/orders", action: "Ouvrir les achats" };

  return <div className="dashboard-container">
    <header className="dashboard-header"><h1>Aujourd'hui</h1>
      <span className="dashboard-date"><Calendar size={18} aria-hidden="true" />{new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}</span>
    </header>

    <section className="today-focus" aria-labelledby="today-focus-title">
      <span className="today-eyebrow">À faire</span>
      <h2 id="today-focus-title">{focus.title}</h2>
      <p>{focus.detail}</p>
      <Link to={focus.to} className="btn btn-primary">{focus.action}<ArrowRight size={17} aria-hidden="true" /></Link>
    </section>

    <div className="today-grid">
      <section className="today-card" aria-labelledby="today-stock-title"><h2 id="today-stock-title">Stocks</h2>
        {productsLoading ? <p role="status">Chargement du stock…</p> : productsError ? <div role="alert"><p>Stock indisponible.</p><Button variant="outline" onClick={() => void refreshProducts()}>Réessayer</Button></div> :
          <p>{stockToReview.length === 0 ? "Aucun produit au seuil bas dans l'inventaire enregistré." : `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} à vérifier dans l'inventaire enregistré.`}</p>}
        <small>Les produits initiaux sont des exemples à confirmer.</small>
        <div className="today-card-actions"><Link to="/stocks">Ouvrir les stocks</Link><button type="button" onClick={() => setInvoiceOpen(true)}>Saisir une facture</button></div>
      </section>
      <section className="today-card" aria-labelledby="today-sales-title"><h2 id="today-sales-title">Ventes</h2>
        {salesError ? <div role="alert"><p>{salesError}</p><Button variant="outline" onClick={() => setSalesReload((value) => value + 1)}>Réessayer</Button></div> : sales === null ? <p role="status">Chargement des ventes…</p> :
          <p>{latestSale ? `Dernières ventes enregistrées le ${new Date(`${latestSale.serviceDate}T12:00:00`).toLocaleDateString("fr-FR")}.` : "Aucune vente enregistrée sur les 30 derniers jours."}</p>}
        {latestSale && <small>Source : {latestSale.source === "csv" ? "import CSV" : "saisie manuelle"}.</small>}
        <div className="today-card-actions"><Link to="/sales#sales-start">Ajouter ou corriger des ventes</Link></div>
      </section>
      <section className="today-card" aria-labelledby="today-order-title"><h2 id="today-order-title">Commande en préparation</h2>
        <p aria-live="polite">{cartLoading ? "Chargement…" : cartItems.length === 0 ? "Aucun article sélectionné." : `${cartItems.length} article${cartItems.length > 1 ? "s" : ""} à revoir.`}</p>
        <div className="today-card-actions"><Link to="/orders#selection">Ouvrir les achats</Link></div>
      </section>
    </div>

    <details className="today-examples"><summary>Découvrir les exemples de Kookia</summary>
      <p>Les scénarios d'achat et le menu d'exemple ne sont pas calculés à partir de vos ventes. Les ventes enregistrées servent aux indicateurs, pas encore à des suggestions d'achat.</p>
      <div className="today-card-actions"><Link to="/predictions">Voir les scénarios</Link><button type="button" onClick={() => setMenuOpen(true)}>Voir le menu d'exemple</button></div>
    </details>

    <Modal isOpen={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Factures et réceptions" width="lg">
      <InvoiceModal onValidate={() => { addToast("success", "Réception enregistrée", "Stock mis à jour."); void refreshProducts(); }} onClose={() => setInvoiceOpen(false)} />
    </Modal>
    <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Préparer le menu" width="md">
      <MenuIdeasModal onValidate={() => addToast("success", "Menu validé", "Le menu est prêt à imprimer.")} onClose={() => setMenuOpen(false)} />
    </Modal>
  </div>;
}
