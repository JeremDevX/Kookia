import React from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { Package, Truck, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { getPredictionPriority } from "../../services/predictionService";
import type { Prediction } from "../../types";

interface PredictionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: Prediction | null;
  onOrder: () => void;
}

const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({
  isOpen,
  onClose,
  prediction,
  onOrder,
}) => {
  // Stable mock values for display purposes
  // (In production, these would come from real data)
  const historyDays = 75;
  const currentStock = 4;

  if (!prediction) return null;

  const estimatedCost = (prediction.recommendation?.quantity || 0) * 2.4;
  const priority = getPredictionPriority(prediction);
  const label = priority === "critical" ? "Urgent" : "Modéré";
  const status = priority === "critical" ? "urgent" : "moderate";

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
              {new Date(prediction.predictedDate).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <Badge
            label={label}
            status={status}
          />
        </div>

        {/* AI Analysis */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-600 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Analyse IA</h4>
              <p className="text-sm text-blue-800">
                {prediction.recommendation?.reason}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Fiabilité: {(prediction.confidence * 100).toFixed(0)}% basée sur{" "}
                {historyDays} jours d'historique
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
              {prediction.predictedConsumption} kg
            </p>
            <p className="text-xs text-secondary mt-1">par jour (moyenne)</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Stock actuel
              </span>
            </div>
            <p className="text-2xl font-bold text-urgent">{currentStock} kg</p>
            <p className="text-xs text-secondary mt-1">Rupture prévue demain</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Coût estimé
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {estimatedCost.toFixed(2)} €
            </p>
            <p className="text-xs text-secondary mt-1">
              pour {prediction.recommendation?.quantity}u
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <Truck className="text-green-600 mt-1" size={20} />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">
                Recommandation
              </h4>
              <p className="text-sm text-green-800 mb-3">
                Commander{" "}
                <strong>{prediction.recommendation?.quantity} unités</strong>{" "}
                auprès de <strong>Franck Légumes</strong>
              </p>
              <div className="flex items-center gap-4 text-xs text-green-700">
                <span>📦 Livraison: 24h</span>
                <span>💰 Prix unitaire: 2.40€</span>
                <span>✅ Fournisseur vérifié</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onOrder}>Commander maintenant</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PredictionDetailModal;
