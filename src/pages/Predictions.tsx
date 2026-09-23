import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import PredictionDetailModal from "../components/predictions/PredictionDetailModal";
import CalendarView from "../components/predictions/CalendarView";
import {
  ShoppingCart,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { usePredictions } from "../hooks";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/useCart";
import type { Prediction } from "../types";
import { getPredictionPriority, isActionablePurchasePrediction } from "../domain/predictions/prediction.policies";
import { isOnOrAfterRestaurantToday } from "../utils/date";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import "./Predictions.css";
import "../styles/Workspace.css";

const Predictions: React.FC = () => {
  const { addToast } = useToast();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { predictions, loading, error, refetch } = usePredictions();
  const { findProductById, findSupplierByProductId } = useInventoryCatalog();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedPrediction, setSelectedPrediction] =
    useState<Prediction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getSupplierName = (productId: string) =>
    findSupplierByProductId(productId)?.name;

  const getProductUnitPrice = (productId: string) =>
    findProductById(productId)?.pricePerUnit;

  const getProductUnit = (productId: string) =>
    findProductById(productId)?.unit;

  const getCurrentStock = (productId: string) =>
    findProductById(productId)?.currentStock;

  const handleSelectExample = async (pred: Prediction) => {
    const product = findProductById(pred.productId);
    if (!isActionablePurchasePrediction(pred) || !product || !pred.recommendation) return;
    const saved = await addToCart({
      id: `prediction-${pred.id}`, predictionId: pred.id, productId: product.id,
      productName: product.name, quantity: pred.recommendation.quantity,
      unit: product.unit, source: "prediction",
    });
    if (saved) {
      addToast("success", "Article sélectionné", "Vérifiez la quantité avant de valider.");
      navigate("/orders#selection");
    }
  };

  const handleShowDetails = (pred: Prediction) => {
    setSelectedPrediction(pred);
    setIsDetailModalOpen(true);
  };

  const handleOrderFromModal = () => {
    if (selectedPrediction) {
      void handleSelectExample(selectedPrediction);
      setIsDetailModalOpen(false);
    }
  };

  const currentPredictions = predictions.filter((pred) => isOnOrAfterRestaurantToday(pred.predictedDate));
  const historicalCount = predictions.length - currentPredictions.length;
  const urgentPredictions = currentPredictions.filter(
    (p) => getPredictionPriority(p) === "critical"
  );
  const moderatePredictions = currentPredictions.filter(
    (p) => getPredictionPriority(p) !== "critical"
  );

  return (
    <div className="predictions-container workspace-page">
      <header className="workspace-header">
        <div>
          <h1>Prévisions de consommation</h1>
          <p className="workspace-subtitle">Scénarios d’exemple, sans données de vente ni météo.</p>
        </div>
        <div className="view-toggles">
          <Button
            aria-pressed={viewMode === "list"}
            variant={viewMode === "list" ? "primary" : "secondary"}
            onClick={() => setViewMode("list")}
            size="sm"
          >
            Liste
          </Button>
          <Button
            aria-pressed={viewMode === "calendar"}
            variant={viewMode === "calendar" ? "primary" : "secondary"}
            onClick={() => setViewMode("calendar")}
            size="sm"
            icon={<Calendar size={14} />}
          >
            Calendrier
          </Button>
        </div>
      </header>

      {loading && <p role="status">Chargement des prévisions…</p>}
      {error && <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div>}
      {historicalCount > 0 && <p role="status">{historicalCount} scénario{historicalCount > 1 ? "s" : ""} passé{historicalCount > 1 ? "s" : ""} dans le calendrier.</p>}

      {urgentPredictions.length > 0 && <div className="workspace-summary"><div><span>Achats à vérifier rapidement</span><strong>{urgentPredictions.length} suggestion{urgentPredictions.length > 1 ? "s" : ""}</strong></div></div>}

      {viewMode === "list" ? (
        <div className="predictions-grid">
          {!loading && !error && currentPredictions.length === 0 && <p className="workspace-empty">Aucune prévision à venir. Consultez le calendrier pour l’historique.</p>}
          {currentPredictions.length > 0 && <>
          {/* Urgent Section */}
          <section>
            <div className="section-header urgent">
              <h2 className="section-title text-urgent">
                Achats à vérifier rapidement
              </h2>
            </div>
            <div className="cards-stack">
              {urgentPredictions.length === 0 && currentPredictions.length > 0 && <div className="workspace-empty">Aucun achat prioritaire.</div>}
              {urgentPredictions.map((pred) => {
                const unitPrice = getProductUnitPrice(pred.productId);
                const supplierName = getSupplierName(pred.productId);
                const unit = getProductUnit(pred.productId);
                return (
                  <Card
                    key={pred.id}
                    className="prediction-card urgent-border"
                  >
                    <div className="pred-main">
                      <div className="pred-info">
                        <div className="pred-header">
                          <h3 className="product-name">{pred.productName}</h3>
                          <Badge label="À vérifier rapidement" status="urgent" />
                        </div>
                        <div className="pred-reason">
                          <Calendar size={16} className="text-secondary" />
                          <span>
                            {pred.recommendation?.reason || "Aucune explication disponible."}
                          </span>
                        </div>
                        <div className="pred-stats">
                          <div className="stat">
                            <span className="label">Échéance</span>
                            <span className="value">{new Date(`${pred.predictedDate}T12:00:00`).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Consommation estimée</span>
                            <span className="value">
                              {pred.predictedConsumption} {unit ?? "(unité indisponible)"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pred-action-panel">
                        <div className="recommendation-box">
                          <span className="rec-label">Recommandation</span>
                          <div className="flex items-baseline gap-2">
                            <span className="rec-value">
                              Achat suggéré : {pred.recommendation?.quantity} {unit ?? "(unité indisponible)"}
                            </span>
                            {unitPrice !== undefined && <span className="text-sm font-medium text-primary">
                              (~
                              {(
                                (pred.recommendation?.quantity || 0) * unitPrice
                              ).toFixed(2)}
                              €)
                            </span>}
                          </div>
                          <span className="rec-sub">
                            Fournisseur : {supplierName ?? "non renseigné"}{unitPrice !== undefined && ` (${unitPrice.toFixed(2)} €/${unit ?? "unité"})`}
                          </span>
                        </div>
                        <div className="action-buttons">
                          <Button
                            className="w-full"
                            icon={<ShoppingCart size={16} />}
                            onClick={() => void handleSelectExample(pred)}
                            disabled={!isActionablePurchasePrediction(pred)}
                          >
                            Ajouter à la commande
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Moderate Section */}
          <section>
            <div className="section-header">
              <h2 className="section-title text-moderate">
                Autres scénarios
              </h2>
            </div>
            <div className="cards-stack">
              {moderatePredictions.map((pred) => {
                const priority = getPredictionPriority(pred);
                const badgeLabel = priority === "high" ? "Élevé" : "Normal";
                const badgeStatus = priority === "high" ? "moderate" : "optimal";
                return (
                  <Card
                    key={pred.id}
                    className="prediction-card"
                  >
                    <div className="pred-compact">
                      <div className="pred-info-compact">
                        <h3 className="product-name text-lg">
                          {pred.productName}
                        </h3>
                        <span className="compact-reason">
                          {pred.recommendation?.action === "wait" ? "Attendre · " : pred.recommendation?.action === "reduce" ? "Réduire · " : "Achat suggéré · "}{pred.recommendation?.reason || "Aucune explication disponible."}
                        </span>
                      </div>
                      <div className="pred-meta">
                        <Badge label={badgeLabel} status={badgeStatus} />
                      </div>
                      <div className="compact-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetails(pred)}
                        >
                          Voir le scénario
                        </Button>
                        <Button
                          size="sm"
                          icon={<ArrowRight size={14} />}
                          onClick={() => void handleSelectExample(pred)}
                          disabled={!isActionablePurchasePrediction(pred)}
                        >
                          Ajouter à la commande
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
          </>}
        </div>
      ) : (
        <CalendarView predictions={predictions} onPredictionClick={handleShowDetails} />
      )}

      <PredictionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        prediction={selectedPrediction}
        onOrder={handleOrderFromModal}
        supplierName={
          selectedPrediction
            ? getSupplierName(selectedPrediction.productId)
            : undefined
        }
        unitPrice={
          selectedPrediction
            ? getProductUnitPrice(selectedPrediction.productId)
            : undefined
        }
        currentStock={
          selectedPrediction
            ? getCurrentStock(selectedPrediction.productId)
            : undefined
        }
        productUnit={
          selectedPrediction
            ? getProductUnit(selectedPrediction.productId)
            : undefined
        }
      />
    </div>
  );
};

export default Predictions;
