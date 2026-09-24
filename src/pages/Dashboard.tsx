import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Modal";
import MenuIdeasModal from "../components/dashboard/MenuIdeasModal";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/useCart";
import { getProductStatus } from "../domain/inventory/product.policies";
import { describeServiceSources } from "../features/sales/salesPresentation";
import { useProducts } from "../hooks";
import { getLatestService, type LatestService } from "../services/salesService";
import { getRestaurant, type Restaurant } from "../services/restaurantService";
import { formatLocalISODate } from "../utils/date";
import "./Dashboard.css";

export default function Dashboard() {
  const today = formatLocalISODate(new Date());
  const thirtyDaysAgo = new Date(Date.parse(today) - 29 * 86_400_000).toISOString().slice(0, 10);
  const { addToast } = useToast();
  const { cartItems, loading: cartLoading, loadError: cartError, refreshCart } = useCart();
  const { products, loading: productsLoading, error: productsError, refetch: refreshProducts } = useProducts();
  const [latestService, setLatestService] = useState<LatestService | null | undefined>(undefined);
  const [salesError, setSalesError] = useState("");
  const [salesReload, setSalesReload] = useState(0);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantError, setRestaurantError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const stockToReview = products.filter((product) => getProductStatus(product) !== "optimal");
  const criticalStockCount = stockToReview.filter((product) => getProductStatus(product) === "urgent").length;
  const hasExampleItem = cartItems.some((item) => !!item.predictionId);
  const isFirstRun = latestService === null;
  const showSalesStartActions = isFirstRun && !cartLoading && !cartError && cartItems.length === 0 && !salesError;

  useEffect(() => {
    let active = true;
    getLatestService().then(
      (result) => { if (active) { setLatestService(result); setSalesError(""); } },
      () => { if (active) setSalesError("Les ventes enregistrées ne sont pas disponibles."); },
    );
    return () => { active = false; };
  }, [salesReload]);

  useEffect(() => {
    if (!isFirstRun) return;
    let active = true;
    getRestaurant().then(
      (result) => { if (active) { setRestaurant(result); setRestaurantError(""); } },
      () => { if (active) setRestaurantError("Informations de l'établissement indisponibles."); },
    );
    return () => { active = false; };
  }, [isFirstRun]);

  const focus = cartError
    ? { title: "Commande en préparation indisponible", detail: cartError, to: "/orders#selection", action: "Reprendre les achats" }
    : !cartLoading && cartItems.length > 0
      ? hasExampleItem
        ? { title: "Corrigez votre sélection", detail: "Un ancien scénario d'exemple doit être écarté avant la validation.", to: "/orders#selection", action: "Ouvrir la sélection" }
        : { title: "Une commande attend votre validation", detail: `${cartItems.length} article${cartItems.length > 1 ? "s" : ""} à revoir.`, to: "/orders#selection", action: "Revoir les quantités" }
      : salesError
        ? { title: "Vérifiez vos ventes", detail: "Leur état n'a pas pu être chargé.", to: "/sales", action: "Ouvrir les ventes" }
        : latestService === undefined
          ? { title: "Retrouvez vos données", detail: "Vos ventes et vos stocks sont en cours de chargement.", to: "/sales", action: "Ouvrir les ventes" }
          : latestService === null
            ? { title: "Ajoutez vos premières ventes", detail: "Importez un CSV Kookia ou saisissez une vente pour commencer avec vos données.", to: "/sales#sales-start", action: "Ajouter des ventes" }
            : latestService.serviceDate < thirtyDaysAgo
              ? { title: "Complétez vos ventes récentes", detail: `Dernier service enregistré le ${new Date(`${latestService.serviceDate}T12:00:00`).toLocaleDateString("fr-FR")}.`, to: "/sales#sales-start", action: "Ajouter des ventes" }
              : productsError
                ? { title: "Vérifiez votre stock", detail: "L'inventaire n'a pas pu être chargé.", to: "/stocks", action: "Ouvrir les stocks" }
                : productsLoading
                  ? { title: "Retrouvez vos données", detail: "L'inventaire est en cours de chargement.", to: "/stocks", action: "Ouvrir les stocks" }
                  : stockToReview.length > 0
                    ? { title: "Vérifiez les stocks à surveiller", detail: `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} au seuil ou en dessous. Les produits initiaux sont des exemples à confirmer.`, to: "/stocks", action: "Voir les stocks" }
                    : { title: "Aucune alerte de stock enregistrée", detail: "Vérifiez les ventes du dernier service ou préparez vos prochains achats.", to: "/orders", action: "Ouvrir les achats" };

  return <div className="dashboard-container">
    <header className="dashboard-header"><h1>Aujourd'hui</h1>
      <span className="dashboard-date"><Calendar size={18} aria-hidden="true" />{new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}</span>
    </header>

    <section className="today-focus" aria-labelledby="today-focus-title">
      <span className="today-eyebrow">À faire</span>
      <h2 id="today-focus-title">{focus.title}</h2>
      <p>{focus.detail}</p>
      {showSalesStartActions ? <div className="today-focus-actions"><Link to="/sales#sales-import-title" className="btn btn-primary">Importer un CSV<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/sales#sales-entry-title" className="btn btn-outline">Saisir une vente</Link></div> :
        <Link to={focus.to} className="btn btn-primary">{focus.action}<ArrowRight size={17} aria-hidden="true" /></Link>}
    </section>

    {isFirstRun && <section className="today-onboarding" aria-labelledby="today-onboarding-title">
      <h2 id="today-onboarding-title">Votre mise en route</h2>
      <ol><li><strong>Établissement</strong><span>{restaurant ? `${restaurant.name} · informations initiales à confirmer` : restaurantError || "Chargement des informations…"}</span><Link to="/settings">Vérifier l'établissement</Link></li>
        <li><strong>Ventes</strong><span>Aucune vente enregistrée. Choisissez l'import CSV ou la saisie ci-dessus.</span></li>
        <li><strong>Stocks</strong><span>Les produits initiaux sont des exemples à confirmer avant vos premiers achats.</span><Link to="/stocks">Vérifier les stocks</Link></li></ol>
      <p>Les ventes alimentent le bilan, mais pas encore des suggestions d'achat automatiques.</p>
    </section>}

    <div className="today-grid">
      <section className="today-card" aria-labelledby="today-stock-title"><h2 id="today-stock-title">Stocks</h2>
        {productsLoading ? <p role="status">Chargement du stock…</p> : productsError ? <div role="alert"><p>Stock indisponible.</p><Button variant="outline" onClick={() => void refreshProducts()}>Réessayer</Button></div> :
          <p>{stockToReview.length === 0 ? "Aucun produit au seuil bas dans l'inventaire enregistré." : `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} à vérifier dans l'inventaire enregistré.`}</p>}
        {!productsLoading && !productsError && criticalStockCount > 0 && <Badge label={`${criticalStockCount} critique${criticalStockCount > 1 ? "s" : ""} selon le seuil`} status="urgent" />}
        <small>{latestService?.sources.includes("demo_simulation")
          ? "Ce scénario contient des stocks, réceptions, productions et pertes simulés, à ne pas confondre avec un inventaire réel."
          : "Les seuils sont des exemples à confirmer ; vérifiez la provenance des quantités et mouvements avant vos décisions."}</small>
        <div className="today-card-actions"><Link to="/stocks">Ouvrir les stocks</Link><Link to="/orders#invoices">Revoir les factures</Link></div>
      </section>
      <section className="today-card" aria-labelledby="today-sales-title"><h2 id="today-sales-title">Ventes</h2>
        {salesError ? <div role="alert"><p>{salesError}</p><Button variant="outline" onClick={() => { setLatestService(undefined); setSalesError(""); setSalesReload((value) => value + 1); }}>Réessayer</Button></div> : latestService === undefined ? <p role="status">Chargement des ventes…</p> :
          <p>{latestService ? `Dernier service enregistré le ${new Date(`${latestService.serviceDate}T12:00:00`).toLocaleDateString("fr-FR")}.` : "Aucune vente enregistrée."}</p>}
        {latestService && <small>Source : {describeServiceSources(latestService.sources)}.</small>}
        <div className="today-card-actions"><Link to="/sales#sales-start">Ajouter ou corriger des ventes</Link></div>
      </section>
      <section className="today-card" aria-labelledby="today-order-title"><h2 id="today-order-title">Commande en préparation</h2>
        {cartLoading ? <p role="status">Chargement…</p> : cartError ? <div role="alert"><p>Commande indisponible : {cartError}</p>
          <Button type="button" variant="outline" onClick={() => void refreshCart()}>Réessayer</Button></div> :
          <p aria-live="polite">{cartItems.length === 0 ? "Aucun article sélectionné." : `${cartItems.length} article${cartItems.length > 1 ? "s" : ""} à revoir.`}</p>}
        <div className="today-card-actions"><Link to="/orders#selection">Ouvrir les achats</Link></div>
      </section>
    </div>

    <details className="today-examples"><summary>Découvrir les exemples de Kookia</summary>
      <p>Les scénarios d'achat et le menu d'exemple ne sont pas calculés à partir de vos ventes. Les ventes enregistrées servent aux indicateurs, pas encore à des suggestions d'achat.</p>
      <div className="today-card-actions"><Link to="/predictions">Voir les scénarios</Link><button type="button" onClick={() => setMenuOpen(true)}>Voir le menu d'exemple</button></div>
    </details>

    <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Préparer le menu" width="md">
      <MenuIdeasModal onValidate={() => addToast("success", "Menu validé", "Le menu est prêt à imprimer.")} onClose={() => setMenuOpen(false)} />
    </Modal>
  </div>;
}
