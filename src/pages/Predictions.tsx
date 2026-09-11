import React, { useState } from "react";
import Modal from "../components/common/Modal";
import OrderGenerator from "../components/dashboard/OrderGenerator";
import { createOrderRecommendationsFromPredictions } from "../features/orders/orderRecommendations";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import PredictionDetailModal from "../components/predictions/PredictionDetailModal";
import CalendarView from "../components/predictions/CalendarView";
import {
  ShoppingCart,
  Mail,
  ArrowRight,
  Brain,
  Calendar,
} from "lucide-react";
import { usePredictions } from "../hooks";
import { useToast } from "../context/ToastContext";
import type { Prediction } from "../types";
import { getPredictionPriority } from "../domain/predictions/prediction.policies";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import "./Predictions.css";
import "../styles/Workspace.css";

const Predictions: React.FC = () => {
  const { addToast } = useToast();
  const { predictions } = usePredictions();
  const { findProductById, findSupplierByProductId } = useInventoryCatalog();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedPrediction, setSelectedPrediction] =
    useState<Prediction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reviewPrediction, setReviewPrediction] = useState<Prediction | null>(null);

  const getSupplierName = (productId: string) =>
    findSupplierByProductId(productId)?.name || "le fournisseur";

  const getProductUnitPrice = (productId: string) =>
    findProductById(productId)?.pricePerUnit ?? 0;

  const getProductUnit = (productId: string) =>
    findProductById(productId)?.unit ?? "u";

  const getCurrentStock = (productId: string) =>
    findProductById(productId)?.currentStock ?? 0;

  const handleAutoOrder = (pred: Prediction) => setReviewPrediction(pred);

  const handleEmailSupplier = (pred: Prediction) => {
    const supplier = findSupplierByProductId(pred.productId);
    if (!supplier?.email) { addToast("info", "Contact indisponible", "Aucune adresse email renseignée."); return; }
    window.location.href = `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(`Demande de devis — ${pred.productName}`)}`;
  };

  const handleShowDetails = (pred: Prediction) => {
    setSelectedPrediction(pred);
    setIsDetailModalOpen(true);
  };

  const handleOrderFromModal = () => {
    if (selectedPrediction) {
      handleAutoOrder(selectedPrediction);
      setIsDetailModalOpen(false);
    }
  };

  const urgentPredictions = predictions.filter(
    (p) => getPredictionPriority(p) === "critical"
  );
  const moderatePredictions = predictions.filter(
    (p) => getPredictionPriority(p) !== "critical"
  );

  return (
    <div className="predictions-container workspace-page">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">UNE LONGUEUR D’AVANCE</p>
          <h1>Anticipez les prochains services.</h1>
          <p className="workspace-subtitle">Des prévisions pour éclairer vos achats. Votre expertise pour décider.</p>
        </div>
        <div className="view-toggles">
          <Button
            aria-pressed={viewMode === "list"}
            variant={viewMode === "list" ? "primary" : "secondary"}
            onClick={() => setViewMode("list")}
            size="sm"
          >
            Liste Priorités
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

      <div className="workspace-summary"><div><span>À examiner en priorité</span><strong>{urgentPredictions.length} suggestion{urgentPredictions.length > 1 ? "s" : ""}</strong></div><p>Les prévisions sont des estimations. Vérifiez les quantités et les besoins avant de confirmer.</p></div>

      {viewMode === "list" ? (
        <div className="predictions-grid">
          {/* Urgent Section */}
          <section>
            <div className="section-header urgent">
              <h2 className="section-title text-urgent">
                À traiter en priorité
              </h2>
            </div>
            <div className="cards-stack">
              {urgentPredictions.length === 0 && <div className="workspace-empty">Aucune suggestion critique pour le moment.</div>}
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
                          <Badge label="Priorité critique" status="urgent" />
                        </div>
                        <div className="pred-reason">
                          <Brain size={16} className="text-secondary" />
                          <span>
                            IA: {pred.recommendation?.reason} (Confiance:{" "}
                            {(pred.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="pred-stats">
                          <div className="stat">
                            <span className="label">Stock Prévu</span>
                            <span className="value text-urgent">Critique</span>
                          </div>
                          <div className="stat">
                            <span className="label">Conso. Moyenne</span>
                            <span className="value">
                              {pred.predictedConsumption} {unit}/j
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pred-action-panel">
                        <div className="recommendation-box">
                          <span className="rec-label">Recommandation</span>
                          <div className="flex items-baseline gap-2">
                            <span className="rec-value">
                              Commander {pred.recommendation?.quantity} {unit}
                            </span>
                            <span className="text-sm font-medium text-primary">
                              (~
                              {(
                                (pred.recommendation?.quantity || 0) * unitPrice
                              ).toFixed(2)}
                              €)
                            </span>
                          </div>
                          <span className="rec-sub">
                            Fournisseur: {supplierName} ({unitPrice.toFixed(2)}€/{unit})
                          </span>
                        </div>
                        <div className="action-buttons">
                          <Button
                            className="w-full"
                            icon={<ShoppingCart size={16} />}
                            onClick={() => handleAutoOrder(pred)}
                            disabled={pred.recommendation?.action !== "buy"}
                          >
                            Revoir la commande
                          </Button>
                          <Button
                            variant="secondary"
                            className="w-full"
                            icon={<Mail size={16} />}
                            onClick={() => handleEmailSupplier(pred)}
                          >
                            Email Fournisseur
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
                Les autres suggestions
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
                          {pred.recommendation?.reason}
                        </span>
                      </div>
                      <div className="pred-meta">
                        <Badge label={badgeLabel} status={badgeStatus} />
                        <span className="confidence-pill">
                          Confiance : {(pred.confidence * 100).toFixed(0)} %
                        </span>
                      </div>
                      <div className="compact-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetails(pred)}
                        >
                          Détails
                        </Button>
                        <Button
                          size="sm"
                          icon={<ArrowRight size={14} />}
                          onClick={() => handleAutoOrder(pred)}
                          disabled={pred.recommendation?.action !== "buy"}
                        >
                          Revoir la commande
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <CalendarView predictions={predictions} onPredictionClick={handleShowDetails} />
      )}

      <Modal isOpen={reviewPrediction !== null} onClose={() => setReviewPrediction(null)} title="Revoir la commande" width="lg">
        <OrderGenerator recommendations={reviewPrediction ? createOrderRecommendationsFromPredictions([reviewPrediction]) : []} onClose={() => setReviewPrediction(null)} />
      </Modal>
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
