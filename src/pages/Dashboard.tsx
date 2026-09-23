import React, { useState, useEffect } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import InvoiceModal from "../components/dashboard/InvoiceModal";
import MenuIdeasModal from "../components/dashboard/MenuIdeasModal";
import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import RecommendationsSection from "../components/dashboard/RecommendationsSection";
import OrderGenerator from "../components/dashboard/OrderGenerator";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/useCart";
import { Calendar, FileText, ChefHat, ShoppingBag, ArrowUpRight, Leaf, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePredictions, useProducts } from "../hooks";
import { isActionablePurchasePrediction } from "../domain/predictions/prediction.policies";
import { getRestaurant, type Restaurant } from "../services/restaurantService";
import { useAuth } from "../features/auth/context/AuthContext";
import {
  createOrderRecommendationsFromCartItems,
} from "../features/orders/orderRecommendations";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const [showOrderGenerator, setShowOrderGenerator] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);


  const { addToast } = useToast();
  const { cartItems, addToCart, removeFromCart, refreshCart, loading: cartLoading } = useCart();
  const selectedPredictionIds = cartItems.flatMap((item) => item.predictionId ? [item.predictionId] : []);
  const { predictions, loading, error, refetch } = usePredictions();
  const { products, loading: productsLoading, error: productsError, refetch: refreshProducts } = useProducts();

  const handleScanInvoice = () => {
    setIsInvoiceModalOpen(true);
  };

  const handleValidateInvoice = () => {
    addToast(
      "success",
      "Facture Intégrée",
      "Les quantités validées ont été ajoutées au stock."
    );
    void refreshProducts();
  };

  const handleMenuGen = () => {
    setIsMenuModalOpen(true);
  };

  const handleValidateMenu = () => {
    addToast(
      "success",
      "Menu validé",
      "Votre choix a été enregistré. Vous pouvez maintenant imprimer le menu."
    );

  };

  const handleTogglePrediction = async (id: string, productName: string) => {
    const selected = cartItems.find((item) => item.predictionId === id);
    if (selected) { await removeFromCart(selected.id); return; }
    const prediction = predictions.find((item) => item.id === id);
    const product = products.find((item) => item.id === prediction?.productId);
    if (!prediction?.recommendation || !product) return;
    const saved = await addToCart({ id: `prediction-${id}`, predictionId: id, productId: product.id,
      productName, quantity: prediction.recommendation.quantity, unit: product.unit, source: "dashboard" });
    if (saved) addToast("success", "Ajouté au panier", `${productName} ajouté à votre sélection.`);
  };

  const totalCartCount = cartItems.length;

  const handleGenerateOrders = () => {
    if (totalCartCount > 0) {
      setShowOrderGenerator(true);
    } else {
      addToast(
        "info",
        "Sélectionnez des articles",
        "Ajoutez d’abord un article à votre sélection."
      );
    }
  };

  const handleCloseOrderGenerator = () => {
    setShowOrderGenerator(false);

  };

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  useEffect(() => {
    let active = true;
    getRestaurant().then((data) => { if (active) setRestaurant(data); }, () => { if (active) addToast("info", "Restaurant indisponible", "Les informations de votre établissement n’ont pas pu être chargées."); });
    return () => { active = false; };
  }, [addToast]);
  const managerFirstName = user?.displayName ?? "";
  const city = restaurant?.city ?? "";

  const actionablePredictions = predictions.filter((pred) => {
    return isActionablePurchasePrediction(pred);
  });

  const visiblePredictions = actionablePredictions.filter(
    (pred) => !selectedPredictionIds.includes(pred.id)
  );

  const allRecommendations = createOrderRecommendationsFromCartItems(cartItems, products);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">VOTRE CUISINE, EN UN COUP D’ŒIL</p>
          <h1>Bonjour, {managerFirstName}.</h1>
          <p className="dashboard-intro">Une vision claire pour une journée bien préparée.</p>
        </div>
        <div className="dashboard-date">
          <Calendar size={18} aria-hidden="true" />
          <div><span>{todayDate}</span><small>{city}</small></div>
        </div>
      </header>

      <section className="dashboard-brief" aria-labelledby="brief-title">
        <div className="brief-copy">
          <span className="brief-label"><Leaf size={15} aria-hidden="true" /> Le point du jour</span>
          <h2 id="brief-title">Moins d’imprévus.<br />Plus de sérénité en cuisine.</h2>
          <p>Anticipez vos besoins, ajustez vos achats et gardez la main sur chaque décision.</p>
          <a href="#dashboard-recommendations" className="brief-link">Voir les suggestions <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
        <div className="brief-order" id="dashboard-order">
          <span className="brief-order-icon"><ShoppingBag size={23} aria-hidden="true" /></span>
          <h3>Votre prochaine commande</h3>
          <p aria-live="polite">{cartLoading ? "Chargement de votre sélection…" : totalCartCount > 0 ? `${totalCartCount} article${totalCartCount > 1 ? "s" : ""} dans votre sélection` : "Ajoutez des suggestions à votre sélection."}</p>
          <Button onClick={handleGenerateOrders} icon={<ArrowRight size={16} />} disabled={cartLoading || productsLoading || !!productsError || totalCartCount === 0}>Revoir ma commande{totalCartCount > 0 ? ` (${totalCartCount})` : ""}</Button>
          <small>La validation enregistre votre décision ; aucun envoi automatique.</small>
        </div>
      </section>

      <div className="dashboard-section-heading"><h2>Votre situation actuelle</h2><span>Données de votre espace, initialisées avec des exemples</span></div>
      <DashboardKPIs products={products} predictions={predictions} selectedCount={cartLoading ? null : totalCartCount}
        productsReady={!productsLoading && !productsError} predictionsReady={!loading && !error} />

      <div className="dashboard-main-grid">
        <div id="dashboard-recommendations">
        {loading || productsLoading ? <div className="dashboard-state" role="status">Chargement des suggestions…</div> : error || productsError ? <div className="dashboard-state" role="alert"><p>Les suggestions ou le catalogue ne sont pas disponibles pour le moment.</p><Button variant="outline" onClick={() => { void refetch(); void refreshProducts(); }}>Réessayer</Button></div> :
        <RecommendationsSection
          predictions={visiblePredictions}
          products={products}
          selectedIds={selectedPredictionIds}
          onTogglePrediction={handleTogglePrediction}
        />}
        </div>
        <aside className="dashboard-tools" aria-labelledby="tools-title">
          <p className="dashboard-eyebrow">AU QUOTIDIEN</p>
          <h2 id="tools-title">Un coup de main ?</h2>
          <p>Vos outils, à portée de main.</p>
          <button className="dashboard-tool" onClick={handleScanInvoice}><FileText size={21} aria-hidden="true" /><span><strong>Saisir une facture</strong><small>Préparer l’entrée en stock</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
          <button className="dashboard-tool" onClick={handleMenuGen}><ChefHat size={21} aria-hidden="true" /><span><strong>Imaginer le menu</strong><small>Valoriser les produits disponibles</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
          <Link className="dashboard-tool" to="/stocks"><ShoppingBag size={21} aria-hidden="true" /><span><strong>Consulter les stocks</strong><small>Faire le point sur vos produits</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
          <div className="dashboard-note"><Leaf size={20} aria-hidden="true" /><p><strong>Chaque produit compte.</strong><br />Un regard sur vos stocks aujourd’hui, moins de pertes demain.</p></div>
        </aside>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showOrderGenerator}
        onClose={handleCloseOrderGenerator}
        title="Générateur de Commandes"
        width="lg"
      >
        <OrderGenerator
          recommendations={allRecommendations}
          onValidated={() => { void refreshCart(); }}
          onClose={handleCloseOrderGenerator}
        />
      </Modal>

      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Factures et réceptions"
        width="lg"
      >
        <InvoiceModal
          onValidate={handleValidateInvoice}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        title="Générateur de Menu du Jour"
        width="md"
      >
        <MenuIdeasModal
          onValidate={handleValidateMenu}
          onClose={() => setIsMenuModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
