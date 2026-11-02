import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import MenuIdeasModal from "../components/dashboard/MenuIdeasModal";
import TodayPurchaseForecast from "../components/dashboard/TodayPurchaseForecast";
import { purchaseForecastIndicator } from "../features/orders/purchaseForecastPresentation";
import { purchasePreparationHref } from "../features/orders/orderNavigation";
import { getPurchaseSuggestions, type PurchaseSuggestions } from "../services/orderService";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/useCart";
import { getProductStatus, needsStockReview } from "../domain/inventory/product.policies";
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
  const stockHeading = useRef<HTMLHeadingElement>(null);
  const salesHeading = useRef<HTMLHeadingElement>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantError, setRestaurantError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [purchaseForecast, setPurchaseForecast] = useState<PurchaseSuggestions | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseRevision, setPurchaseRevision] = useState(0);
  const purchaseIndicator = purchaseForecastIndicator(purchaseForecast, cartItems.map((item) => item.productId),
    purchaseLoading || cartLoading, !!purchaseError || !!cartError);
  const stockToReview = products.filter(needsStockReview);
  const confirmedStockoutCount = stockToReview.filter((product) => getProductStatus(product) === "urgent").length;
  const hasExampleItem = cartItems.some((item) => !!item.predictionId);
  const isFirstRun = latestService === null;
  const showSalesStartActions = isFirstRun && !cartLoading && !cartError && cartItems.length === 0 && !salesError;

  useEffect(() => {
    let active = true;
    getPurchaseSuggestions().then((result) => {
      if (active) { setPurchaseForecast(result); setPurchaseError(""); setPurchaseLoading(false); }
    }, () => {
      if (active) { setPurchaseError("Les prévisions d’achat n’ont pas pu être chargées."); setPurchaseLoading(false); }
    });
    return () => { active = false; };
  }, [purchaseRevision]);

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
        ? { title: "Corrigez votre sélection", detail: "Une proposition sans source enregistrée doit être retirée avant la validation.", to: "/orders#selection", action: "Ouvrir la sélection" }
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
                  : products.length === 0
                    ? { title: "Aucun produit enregistré", detail: "Ajoutez vos produits pour suivre vos stocks.", to: "/stocks", action: "Ouvrir les stocks" }
                  : stockToReview.length > 0
                    ? { title: "Vérifiez les stocks à surveiller", detail: `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} à vérifier ou sous le seuil théorique. Les niveaux de stock initiaux doivent être confirmés.`, to: "/stocks?stockView=review", action: "Voir les stocks" }
                    : { title: "Aucune alerte de stock enregistrée", detail: "Vérifiez les ventes du dernier service ou préparez vos prochains achats.", to: "/orders", action: "Ouvrir les achats" };

  return <div className="dashboard-container">
    <header className="dashboard-header"><div><h1>Tableau de bord</h1>
      <span className="dashboard-date"><Calendar size={16} aria-hidden="true" />{new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}</span></div>
      <Link to="/sales#sales-start" className="btn btn-primary dashboard-import">Ajouter des ventes</Link>
    </header>

    <div className="dashboard-metrics" aria-label="Situation du restaurant">
      <div className="dashboard-metric"><span>Couverts prévus</span><strong>—</strong><small>Prévision indisponible</small></div>
      <div className="dashboard-metric"><span>Chiffre d’affaires estimé</span><strong>—</strong><small>Estimation indisponible</small></div>
      <Link to="/stocks?stockView=review" className="dashboard-metric"><span>Alertes de stock</span><strong>{productsLoading || productsError || products.length === 0 ? "—" : stockToReview.length}</strong><small>{productsError ? "Stock indisponible" : productsLoading ? "Chargement…" : products.length === 0 ? "Aucun produit enregistré" : "Produits à vérifier"}</small></Link>
      <Link to={purchasePreparationHref} className="dashboard-metric"><span>Produits suggérés</span><strong>{purchaseIndicator.value}</strong><small>{purchaseIndicator.detail}</small></Link>
    </div>

    <div className="dashboard-columns"><div className="dashboard-main-column">
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
        <li><strong>Stocks</strong><span>Vérifiez les quantités et les pièces source avant vos premiers achats.</span><Link to="/stocks">Vérifier les stocks</Link></li></ol>
      <p>Les prévisions et besoins d'achat nécessitent 28 jours de service complets et un comptage de stock récent ; chaque suggestion reste à revoir.</p>
    </section>}

    <TodayPurchaseForecast data={purchaseForecast} loading={purchaseLoading} error={purchaseError} retry={() => {
      setPurchaseLoading(true); setPurchaseError(""); setPurchaseRevision((value) => value + 1);
    }} />
    </div><div className="today-grid">
      <section className="today-card" aria-labelledby="today-stock-title"><h2 id="today-stock-title" ref={stockHeading} tabIndex={-1}>Stocks</h2>
        {productsLoading ? <p role="status">Chargement du stock…</p> : productsError ? <div role="alert"><p>Stock indisponible.</p><Button variant="outline" onClick={() => {
          void refreshProducts();
          requestAnimationFrame(() => stockHeading.current?.focus());
        }}>Réessayer</Button></div> :
          <p>{products.length === 0 ? "Aucun produit enregistré. Ajoutez vos produits pour suivre vos stocks." : stockToReview.length === 0 ? "Aucun produit sous le seuil théorique." : `${stockToReview.length} produit${stockToReview.length > 1 ? "s" : ""} à vérifier ou sous le seuil théorique.`}</p>}
        {!productsLoading && !productsError && confirmedStockoutCount > 0 && <Badge label={`${confirmedStockoutCount} rupture${confirmedStockoutCount > 1 ? "s" : ""} confirmée${confirmedStockoutCount > 1 ? "s" : ""}`} status="urgent" />}
        {(productsLoading || productsError || products.length > 0) && <small>{latestService?.sources.includes("demo_simulation")
          ? "Certaines opérations du service ne sont pas retenues dans l’inventaire enregistré ; vérifiez les pièces et les mouvements."
          : "Les seuils actuels restent à confirmer ; vérifiez la provenance des quantités et mouvements avant vos décisions."}</small>}
        <div className="today-card-actions"><Link to="/stocks">Ouvrir les stocks</Link><Link to="/orders#invoices">Revoir les factures</Link></div>
      </section>
      <section className="today-card" aria-labelledby="today-sales-title"><h2 id="today-sales-title" ref={salesHeading} tabIndex={-1}>Ventes</h2>
        {salesError ? <div role="alert"><p>{salesError}</p><Button variant="outline" onClick={() => {
          setLatestService(undefined); setSalesError(""); setSalesReload((value) => value + 1);
          requestAnimationFrame(() => salesHeading.current?.focus());
        }}>Réessayer</Button></div> : latestService === undefined ? <p role="status">Chargement des ventes…</p> :
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
    <section className="today-card" aria-labelledby="today-menu-title"><h2 id="today-menu-title">Préparer le menu</h2>
      <p>Trouvez des idées de recettes pour utiliser les produits disponibles en stock.</p>
      <div className="today-card-actions"><button type="button" onClick={() => setMenuOpen(true)}>Voir les idées de menu</button></div>
    </section>

    </div></div>

    {menuOpen && <MenuIdeasModal onValidate={() => addToast("success", "Menu validé", "Le menu est prêt à imprimer.")} onClose={() => setMenuOpen(false)} />}
  </div>;
}
