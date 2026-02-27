import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import {
  CheckCircle,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Recipe } from "../../utils/mockData";

interface ProductionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  maxYield: number;
  onConfirm: (quantity: number) => void;
}

const ProductionConfirmModal: React.FC<ProductionConfirmModalProps> = ({
  isOpen,
  onClose,
  recipe,
  maxYield,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState(maxYield.toString());

  if (!recipe) return null;

  const costPerPortion =
    recipe.ingredients.reduce((sum) => sum + 2.5, 0) /
    recipe.ingredients.length;
  const totalCost = costPerPortion * Number(quantity);
  const estimatedRevenue = totalCost * 4; // 300% margin

  const handleConfirm = () => {
    onConfirm(Number(quantity));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmer la production"
      width="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Recipe Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-2xl font-bold">{recipe.name}</h3>
            <p className="text-sm text-secondary mt-1">
              Catégorie: {recipe.category}
            </p>
          </div>
          <Badge label="Stock disponible" status="optimal" />
        </div>

        {/* Quantity Selector */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label className="block text-sm font-semibold text-blue-900 mb-2">
            Nombre de portions à produire
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max={maxYield}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 px-4 py-2 text-2xl font-bold border-2 border-blue-300 rounded-md text-center"
            />
            <div className="text-sm text-blue-700">
              <div>Maximum possible:</div>
              <div className="font-bold text-lg">{maxYield} portions</div>
            </div>
          </div>
        </div>

        {/* Economics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Coût matière
              </span>
            </div>
            <p className="text-2xl font-bold">{totalCost.toFixed(2)} €</p>
            <p className="text-xs text-secondary mt-1">
              {costPerPortion.toFixed(2)}€ / portion
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                CA estimé
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {estimatedRevenue.toFixed(2)} €
            </p>
            <p className="text-xs text-secondary mt-1">Prix moyen 15€</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-optimal" />
              <span className="text-xs font-semibold text-optimal uppercase">
                Marge brute
              </span>
            </div>
            <p className="text-2xl font-bold text-optimal">
              +{(estimatedRevenue - totalCost).toFixed(2)} €
            </p>
            <p className="text-xs text-optimal mt-1">~300%</p>
          </div>
        </div>

        {/* Ingredients Check */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-optimal" />
            <h4 className="font-semibold">Ingrédients disponibles</h4>
          </div>
          <div className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{ing.productId}</span>
                <span className="text-optimal font-medium">✓ En stock</span>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Attention:</strong> Les ingrédients seront automatiquement
            déduits de votre stock après confirmation.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!quantity || Number(quantity) < 1}
          >
            Lancer la production
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionConfirmModal;
