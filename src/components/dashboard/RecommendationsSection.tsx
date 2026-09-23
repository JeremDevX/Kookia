import React, { useState, useMemo } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import {
  ShoppingCart,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";
import type { Prediction, Product } from "../../types";
import { isActionablePurchasePrediction } from "../../domain/predictions/prediction.policies";
import "./RecommendationsSection.css";

interface RecommendationsSectionProps {
  predictions: Prediction[];
  products: Product[];
  selectedIds: string[];
  onTogglePrediction: (id: string, productName: string) => void;
}

const ITEMS_PER_PAGE = 6;

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  predictions,
  products,
  selectedIds,
  onTogglePrediction,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortMode, setSortMode] = useState<
    "original" | "name" | "date"
  >("original");

  // Sort predictions based on sort mode
  const sortedPredictions = useMemo(() => {
    if (sortMode === "original") return predictions;
    return [...predictions].sort((a, b) => {
      return sortMode === "name"
        ? a.productName.localeCompare(b.productName, "fr")
        : a.predictedDate.localeCompare(b.predictedDate);
    });
  }, [predictions, sortMode]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedPredictions.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPredictions = sortedPredictions.slice(startIndex, endIndex);

  // Count urgent items
  const urgentCount = predictions.filter(
    (p) => isActionablePurchasePrediction(p)
  ).length;

  // Reset to first page when sorting changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [sortMode]);

  // Reset to first page if current page becomes invalid
  React.useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [sortedPredictions.length, currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="recommendations-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Achats suggérés</h2>
          {urgentCount > 0 && (
            <span className="urgent-count-badge">
              {urgentCount} à revoir
            </span>
          )}
        </div>
        <div className="section-header-right">
          <div className="sort-select-wrapper">
            <ArrowUpDown size={16} />
            <select
              aria-label="Trier les suggestions"
              className="sort-select"
              value={sortMode}
              onChange={(e) =>
                setSortMode(
                  e.target.value as "original" | "name" | "date"
                )
              }
            >
              <option value="original">Ordre par défaut</option>
              <option value="date">Échéance la plus proche</option>
              <option value="name">Produit : A à Z</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="pagination-info">
              <span className="pagination-text">
                {startIndex + 1}-{Math.min(endIndex, sortedPredictions.length)}{" "}
                sur {sortedPredictions.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="recommendations-description">Scénarios d’exemple, sans ventes ni météo connectées. Vérifiez les besoins avant de commander.</p>
      <div className="recommendations-list grid-layout">
        {paginatedPredictions.length > 0 ? (
          paginatedPredictions.map((pred) => {
            const product = products.find((item) => item.id === pred.productId);
            const isSelected = selectedIds.includes(pred.id);
            const isUrgent = pred.recommendation?.action === "buy";

            return (
              <Card
                key={pred.id}
                className={`recommendation-card ${
                  isUrgent ? "urgent" : "moderate"
                } ${
                  isSelected ? "border-optimal bg-green-50/10" : "hover-lift"
                }`}
              >
                <div className="p-4 flex flex-col h-full justify-between">
                  <div>
                    {/* Status Badge with text */}
                    <div
                      className={`status-badge ${
                        isUrgent ? "urgent" : "normal"
                      }`}
                    >
                      {isUrgent ? (
                        <>
                          <AlertTriangle size={14} />
                          <span>Achat suggéré</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp size={14} />
                          <span>Optimisation</span>
                        </>
                      )}
                    </div>

                    <div className="rec-header mb-3">
                      <h3 className="rec-product-name">{pred.productName}</h3>
                    </div>

                    <p className="rec-reason mb-4">
                      {pred.recommendation?.reason}
                    </p>

                    <div className="rec-details mb-4">
                      <div className="rec-detail-item">
                        <span className="label">Consommation estimée</span>
                        <span className="value">
                          {pred.predictedConsumption} {product?.unit ?? "unité inconnue"}
                        </span>
                      </div>
                      <div className="rec-detail-item">
                        <span className="label">Achat suggéré</span>
                        <span className="value">
                          {pred.recommendation?.quantity} {product?.unit ?? "unité inconnue"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rec-action">
                    <span className="rec-order-info">
                      {product ? "À vérifier" : "Produit absent du catalogue"}
                    </span>
                    <Button
                      size="sm"
                      aria-label={`${isSelected ? "Retirer" : "Ajouter"} ${pred.productName} ${isSelected ? "de la" : "à la"} commande`}
                      variant={isSelected ? "primary" : "outline"}
                      className={isSelected ? "bg-optimal border-optimal" : ""}
                      disabled={!product && !isSelected}
                      onClick={() =>
                        onTogglePrediction(pred.id, pred.productName)
                      }
                      icon={
                        isSelected ? (
                          <Check size={16} />
                        ) : (
                          <ShoppingCart size={16} />
                        )
                      }
                    >
                      {isSelected ? "Ajouté" : "Ajouter"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="recommendations-empty" role="status">
            <Check size={24} aria-hidden="true" />
            <p>Aucun achat suggéré pour le moment.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            aria-label="Page précédente"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="pagination-dots">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`pagination-dot ${
                  i === currentPage ? "active" : ""
                }`}
                onClick={() => setCurrentPage(i)}
                aria-label={`Page ${i + 1}`}
                aria-current={i === currentPage ? "page" : undefined}
              >{i + 1}</button>
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            aria-label="Page suivante"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendationsSection;
