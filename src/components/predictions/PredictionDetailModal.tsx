import React from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { Package, Truck, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { getPredictionPriority } from "../../domain/predictions/prediction.policies";
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
  supplierName = "le fournisseur",
  unitPrice = 0,
  currentStock = 0,
  productUnit = "u",
}) => {
  // Stable mock values for display purposes
  // (In production, these would come from real data)
  const historyDays = 75;

  if (!prediction) return null;

  const estimatedCost = (prediction.recommendation?.quantity || 0) * unitPrice;
  const priority = getPredictionPriority(prediction);
  const label =
    priority === "critical"
      ? "Urgent"
      : priority === "high"
      ? "Élevé"
      : "Normal";
  const status =
    priority === "critical"
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
              {prediction.predictedConsumption} {productUnit}
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
            <p className="text-2xl font-bold text-urgent">
              {currentStock} {productUnit}
            </p>
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
              pour {prediction.recommendation?.quantity} {productUnit}
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
                Commander <strong>{prediction.recommendation?.quantity}</strong>{" "}
                <strong>{productUnit}</strong> auprès de <strong>{supplierName}</strong>
              </p>
              <div className="flex items-center gap-4 text-xs text-green-700">
                <span>📦 Livraison: 24h</span>
                <span>💰 Prix unitaire: {unitPrice.toFixed(2)}€</span>
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
