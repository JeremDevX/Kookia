import React, { useState } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import InvoiceModal from "../components/dashboard/InvoiceModal";
import MenuIdeasModal from "../components/dashboard/MenuIdeasModal";
import DashboardKPIs from "../components/dashboard/DashboardKPIs";
import RecommendationsSection from "../components/dashboard/RecommendationsSection";
import OrderGenerator from "../components/dashboard/OrderGenerator";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import { Calendar, FileText, ChefHat, ShoppingBag } from "lucide-react";
import { MOCK_PREDICTIONS, MOCK_PRODUCTS } from "../utils/mockData";
import type { Prediction } from "../utils/mockData";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const [showOrderGenerator, setShowOrderGenerator] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [selectedPredictionIds, setSelectedPredictionIds] = useState<string[]>(
    []
  );

  const { addToast } = useToast();
  const { cartItems, clearCart } = useCart();

  const handleScanInvoice = () => {
    setIsInvoiceModalOpen(true);
  };

  const handleValidateInvoice = () => {
    addToast(
      "success",
      "Facture Intégrée",
      "Les stocks de Tomates et Mozzarella ont été mis à jour."
    );
    setIsInvoiceModalOpen(false);
  };

  const handleMenuGen = () => {
    setIsMenuModalOpen(true);
  };

  const handleValidateMenu = () => {
    addToast(
      "success",
      "Menu Validé & Imprimé",
      "La production a été planifiée pour demain."
    );
    setIsMenuModalOpen(false);
  };

  const handleTogglePrediction = (id: string, productName: string) => {
    const isCurrentlySelected = selectedPredictionIds.includes(id);

    if (isCurrentlySelected) {
      // Remove from selection
      setSelectedPredictionIds((prev) => prev.filter((pId) => pId !== id));
    } else {
      // Add to selection
      setSelectedPredictionIds((prev) => [...prev, id]);
      addToast(
        "success",
        "Ajouté à la commande",
        `${productName} ajouté au panier.`
      );
    }
  };

  // Total count includes both dashboard selections and notification cart items
  const totalCartCount = selectedPredictionIds.length + cartItems.length;

  const handleGenerateOrders = () => {
    if (totalCartCount > 0) {
      setShowOrderGenerator(true);
    } else {
      addToast(
        "info",
        "Sélectionnez des articles",
        "Veuillez valider au moins une action."
      );
    }
  };

  const handleCloseOrderGenerator = () => {
    setShowOrderGenerator(false);
    // Clear notification cart after order generation
    clearCart();
  };

  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const visiblePredictions = MOCK_PREDICTIONS.filter(
    (pred) => !selectedPredictionIds.includes(pred.id)
  );

  // For OrderGenerator - combine dashboard selections with notification cart items
  const selectedPredictions = MOCK_PREDICTIONS.filter((pred) =>
    selectedPredictionIds.includes(pred.id)
  );

  // Convert cart items to Prediction-like objects for OrderGenerator
  const cartPredictions: Prediction[] = cartItems.map((item) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      predictedDate: new Date().toISOString().split("T")[0],
      predictedConsumption: item.quantity,
      confidence: 0.95,
      recommendation: {
        action: "buy" as const,
        quantity: item.quantity,
        reason: `Depuis notifications - ${product?.category || "Stock"}`,
      },
    };
  });

  // Merge both sources
  const allRecommendations = [...selectedPredictions, ...cartPredictions];

  return (
    <div className="dashboard-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Bienvenue, Camille ! 👋</h1>
          <p className="page-subtitle flex items-center gap-sm">
            <Calendar size={14} /> {todayDate} • Grenoble • ☀️ 18°C
          </p>
        </div>
        <div className="header-actions">
          {/* Quick Actions Toolbar */}
          <div className="flex gap-sm">
            <Button
              variant="outline"
              size="sm"
              icon={<FileText size={14} />}
              onClick={handleScanInvoice}
            >
              Facture
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ChefHat size={14} />}
              onClick={handleMenuGen}
            >
              Menu
            </Button>
            <Button
              variant={totalCartCount > 0 ? "primary" : "outline"}
              size="sm"
              icon={<ShoppingBag size={14} />}
              onClick={handleGenerateOrders}
              className="generate-btn"
            >
              Générer Commandes ({totalCartCount})
            </Button>
          </div>
        </div>
      </header>

      {/* KPI Section extracted */}
      <DashboardKPIs />

      <div className="dashboard-main-grid">
        {/* Full Width Recommendations */}
        <RecommendationsSection
          predictions={visiblePredictions}
          selectedIds={selectedPredictionIds}
          onTogglePrediction={handleTogglePrediction}
        />
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
          onClose={handleCloseOrderGenerator}
        />
      </Modal>

      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Scanner une Facture"
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
