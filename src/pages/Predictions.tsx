import React, { useState } from "react";
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
  CheckCircle,
} from "lucide-react";
import { MOCK_PREDICTIONS, type Prediction } from "../utils/mockData";
import { useToast } from "../context/ToastContext";
import "./Predictions.css";

const Predictions: React.FC = () => {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedPrediction, setSelectedPrediction] =
    useState<Prediction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderedPredictions, setOrderedPredictions] = useState<string[]>([]);

  const handleAutoOrder = (pred: Prediction) => {
    setOrderedPredictions((prev) => [...prev, pred.id]);
    addToast(
      "success",
      "Commande créée",
      `${pred.recommendation?.quantity}u de ${pred.productName} commandées chez Franck Légumes.`
    );
  };

  const handleEmailSupplier = (pred: Prediction) => {
    addToast(
      "success",
      "Email envoyé",
      `Demande de devis envoyée à Franck Légumes pour ${pred.productName}.`
    );
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

  const urgentPredictions = MOCK_PREDICTIONS.filter((p) => p.confidence > 0.9);
  const moderatePredictions = MOCK_PREDICTIONS.filter(
    (p) => p.confidence <= 0.9
  );

  return (
    <div className="predictions-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Prédictions & Achats</h1>
          <p className="page-subtitle">Recommandations basées sur l'IA</p>
        </div>
        <div className="view-toggles">
          <Button
            variant={viewMode === "list" ? "primary" : "secondary"}
            onClick={() => setViewMode("list")}
            size="sm"
          >
            Liste Priorités
          </Button>
          <Button
            variant={viewMode === "calendar" ? "primary" : "secondary"}
            onClick={() => setViewMode("calendar")}
            size="sm"
            icon={<Calendar size={14} />}
          >
            Calendrier
          </Button>
        </div>
      </header>

      {viewMode === "list" ? (
        <div className="predictions-grid">
          {/* Urgent Section */}
          <section>
            <div className="section-header urgent">
              <h2 className="section-title text-urgent">
                🔴 Urgent (Commander Aujourd'hui)
              </h2>
            </div>
            <div className="cards-stack">
              {urgentPredictions.map((pred) => {
                const isOrdered = orderedPredictions.includes(pred.id);
                return (
                  <Card
                    key={pred.id}
                    className={`prediction-card urgent-border ${
                      isOrdered ? "ordered" : ""
                    }`}
                  >
                    {isOrdered && (
                      <div className="ordered-badge">
                        <CheckCircle size={16} />
                        <span>Commandé</span>
                      </div>
                    )}
                    <div className="pred-main">
                      <div className="pred-info">
                        <div className="pred-header">
                          <h3 className="product-name">{pred.productName}</h3>
                          <Badge label="Rupture demain" status="urgent" />
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
                            <span className="value text-urgent">Critical</span>
                          </div>
                          <div className="stat">
                            <span className="label">Conso. Moyenne</span>
                            <span className="value">
                              {pred.predictedConsumption} kg/j
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pred-action-panel">
                        <div className="recommendation-box">
                          <span className="rec-label">Recommandation</span>
                          <div className="flex items-baseline gap-2">
                            <span className="rec-value">
                              Commander {pred.recommendation?.quantity} unités
                            </span>
                            <span className="text-sm font-medium text-primary">
                              (~
                              {(
                                (pred.recommendation?.quantity || 0) * 2.4
                              ).toFixed(2)}
                              €)
                            </span>
                          </div>
                          <span className="rec-sub">
                            Fournisseur: Franck Légumes (2.40€/u)
                          </span>
                        </div>
                        <div className="action-buttons">
                          <Button
                            className="w-full"
                            icon={<ShoppingCart size={16} />}
                            onClick={() => handleAutoOrder(pred)}
                            disabled={isOrdered}
                          >
                            {isOrdered ? "Commandé ✓" : "Commander Auto"}
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
                🟡 Modéré (D'ici 2-3 jours)
              </h2>
            </div>
            <div className="cards-stack">
              {moderatePredictions.map((pred) => {
                const isOrdered = orderedPredictions.includes(pred.id);
                return (
                  <Card
                    key={pred.id}
                    className={`prediction-card ${isOrdered ? "ordered" : ""}`}
                  >
                    {isOrdered && (
                      <div className="ordered-badge">
                        <CheckCircle size={16} />
                        <span>Commandé</span>
                      </div>
                    )}
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
                        <Badge label="Modéré" status="moderate" />
                        <span className="confidence-pill">
                          {(pred.confidence * 100).toFixed(0)}% fiable
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
                          disabled={isOrdered}
                        >
                          {isOrdered ? "Commandé ✓" : "Commander"}
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
        <CalendarView predictions={MOCK_PREDICTIONS} />
      )}

      <PredictionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        prediction={selectedPrediction}
        onOrder={handleOrderFromModal}
      />
    </div>
  );
};

export default Predictions;
