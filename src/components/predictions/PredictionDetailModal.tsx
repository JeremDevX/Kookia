import React from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { Package, Truck, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { getPredictionPriority, isActionablePurchasePrediction } from "../../domain/predictions/prediction.policies";
import { isOnOrAfterRestaurantToday } from "../../utils/date";
import type { Prediction } from "../../types";

interface PredictionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: Prediction | null;
  onOrder: () => void;
  supplierName?: string;
  unitPrice?: number;
  currentStock?: number;
  productUnit?: string;
}

const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({
  isOpen,
  onClose,
  prediction,
  onOrder,
  supplierName,
  unitPrice,
  currentStock,
  productUnit,
}) => {
  if (!prediction) return null;

  const canOrder = isActionablePurchasePrediction(prediction);
  const isHistorical = !isOnOrAfterRestaurantToday(prediction.predictedDate);
  const estimatedCost = unitPrice === undefined || !canOrder ? null : prediction.recommendation!.quantity * unitPrice;
  const priority = getPredictionPriority(prediction);
  const label =
    isHistorical ? "Historique" : priority === "critical"
      ? "Urgent"
      : priority === "high"
      ? "Élevé"
      : "Normal";
  const status =
    isHistorical ? "neutral" : priority === "critical"
      ? "urgent"
      : priority === "high"
      ? "moderate"
      : "optimal";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de la prédiction"
      width="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-2xl font-bold">{prediction.productName}</h3>
            <p className="text-sm text-secondary mt-1">
              Prédiction pour le{" "}
              {new Date(`${prediction.predictedDate}T12:00:00`).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <Badge
            label={label}
            status={status}
          />
        </div>

        {/* Scenario context */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-600 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Scénario de démonstration{isHistorical ? " · date passée" : ""}</h4>
              <p className="text-sm text-blue-800">
                {prediction.recommendation?.reason || "Aucune explication disponible."}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Indice de démonstration : {(prediction.confidence * 100).toFixed(0)} %. Il ne mesure pas une fiabilité réelle ; aucune vente ni météo connectée.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Consommation
              </span>
            </div>
            <p className="text-2xl font-bold">
              {prediction.predictedConsumption} {productUnit ?? "(unité indisponible)"}
            </p>
            <p className="text-xs text-secondary mt-1">Valeur du scénario, pas une moyenne mesurée</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Stock actuel
              </span>
            </div>
            <p className="text-2xl font-bold text-urgent">
              {currentStock === undefined ? "Indisponible" : `${currentStock} ${productUnit ?? ""}`}
            </p>
            <p className="text-xs text-secondary mt-1">Quantité du catalogue actuel</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Coût estimé
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {estimatedCost === null ? "Indisponible" : `${estimatedCost.toFixed(2)} €`}
            </p>
            <p className="text-xs text-secondary mt-1">
              {canOrder ? `Pour ${prediction.recommendation?.quantity} ${productUnit ?? ""}, au prix actuel` : "Pas d’achat suggéré actuellement"}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className={canOrder ? "bg-green-50 p-4 rounded-lg border border-green-200" : "bg-gray-50 p-4 rounded-lg border border-gray-200"}>
          <div className="flex items-start gap-3">
            {canOrder ? <Truck className="text-green-600 mt-1" size={20} /> : <TrendingUp className="text-secondary mt-1" size={20} />}
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">
                Recommandation
              </h4>
              <p className="text-sm text-green-800 mb-3">
                {canOrder ? <>Achat suggéré : <strong>{prediction.recommendation?.quantity} {productUnit ?? "(unité indisponible)"}</strong> auprès de <strong>{supplierName ?? "un fournisseur non renseigné"}</strong>.</> :
                  isHistorical ? "Suggestion historique : à ne pas utiliser comme besoin actuel." :
                  prediction.recommendation?.action === "reduce" ? "Réduction suggérée : vérifiez les besoins avant de modifier vos achats." :
                  "Attente suggérée : aucun achat à valider depuis cette prévision."}
              </p>
              <div className="flex items-center gap-4 text-xs text-green-700">
                {unitPrice !== undefined && <span>Prix catalogue : {unitPrice.toFixed(2)} €/{productUnit ?? "unité"}</span>}
                <span>Livraison et disponibilité fournisseur non vérifiées.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onOrder} disabled={!canOrder}>Revoir la commande</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PredictionDetailModal;
