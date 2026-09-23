import React, { useState } from "react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import PredictionDetailModal from "../components/predictions/PredictionDetailModal";
import CalendarView from "../components/predictions/CalendarView";
import { Calendar } from "lucide-react";
import { usePredictions } from "../hooks";
import type { Prediction } from "../types";
import { isActionablePurchasePrediction } from "../domain/predictions/prediction.policies";
import { isOnOrAfterRestaurantToday } from "../utils/date";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import "./Predictions.css";
import "../styles/Workspace.css";

const Predictions: React.FC = () => {
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

  const handleShowDetails = (pred: Prediction) => {
    setSelectedPrediction(pred);
    setIsDetailModalOpen(true);
  };

  const currentPredictions = predictions.filter((pred) => isOnOrAfterRestaurantToday(pred.predictedDate));
  const historicalCount = predictions.length - currentPredictions.length;
  const purchaseExamples = currentPredictions.filter((prediction) => isActionablePurchasePrediction(prediction));
  const otherExamples = currentPredictions.filter((prediction) => !isActionablePurchasePrediction(prediction));

  return (
    <div className="predictions-container workspace-page">
      <header className="workspace-header">
        <div>
          <h1>Scénarios d'exemple</h1>
          <p className="workspace-subtitle">Scénarios de démonstration à consulter uniquement : ils ne proviennent ni de vos ventes ni de la météo et ne peuvent pas préparer une commande.</p>
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

      {viewMode === "list" ? (
        <div className="predictions-grid">
          {!loading && !error && currentPredictions.length === 0 && <p className="workspace-empty">Aucune prévision à venir. Consultez le calendrier pour l’historique.</p>}
          {currentPredictions.length > 0 && <>
          <section>
            <div className="section-header">
              <h2 className="section-title">
                Exemples d'achat
              </h2>
            </div>
            <div className="cards-stack">
              {purchaseExamples.length === 0 && currentPredictions.length > 0 && <div className="workspace-empty">Aucun exemple d'achat à venir.</div>}
              {purchaseExamples.map((pred) => {
                const unitPrice = getProductUnitPrice(pred.productId);
                const supplierName = getSupplierName(pred.productId);
                const unit = getProductUnit(pred.productId);
                return (
                  <Card
                    key={pred.id}
                    className="prediction-card"
                  >
                    <div className="pred-main">
                      <div className="pred-info">
                        <div className="pred-header">
                          <h3 className="product-name">{pred.productName}</h3>
                          <Badge label="Exemple" status="neutral" />
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
                        <div className="action-buttons"><Button variant="outline" onClick={() => handleShowDetails(pred)}>Voir le scénario</Button></div>
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
                Autres scénarios d'exemple
              </h2>
            </div>
            <div className="cards-stack">
              {otherExamples.map((pred) => {
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
                        <Badge label="Exemple" status="neutral" />
                      </div>
                      <div className="compact-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetails(pred)}
                        >
                          Voir le scénario
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
