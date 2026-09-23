import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import {
  CheckCircle,
  Package,
  AlertTriangle,
} from "lucide-react";
import type { Recipe } from "../../types";
import { validateProductionQuantity } from "../../utils/formValidation";

interface ProductionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  maxYield: number;
  costPerPortion: number | null;
  getProductName: (productId: string) => string;
  getProductUnit: (productId: string) => string;
  onConfirm: (quantity: number, operationId: string) => Promise<void>;
}

const ProductionConfirmModal: React.FC<ProductionConfirmModalProps> = ({
  isOpen,
  onClose,
  recipe,
  maxYield,
  costPerPortion,
  getProductName,
  getProductUnit,
  onConfirm,
}) => {
  const [saving, setSaving] = useState(false);
  const [operationId] = useState(() => crypto.randomUUID());
  const safeMaxYield = Math.min(10_000, Math.max(0, maxYield));
  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState<string | undefined>();

  if (!recipe) return null;

  const quantityValidation = validateProductionQuantity(quantity, safeMaxYield);
  const clampedQuantity = quantityValidation.normalizedQuantity;
  const visibleQuantityError = quantityError ?? (quantity && !quantityValidation.isValid ? quantityValidation.error : undefined);

  const totalCost = costPerPortion === null ? null : costPerPortion * clampedQuantity;

  const handleConfirm = async () => {
    if (saving) return;
    if (!quantityValidation.isValid) {
      setQuantityError(quantityValidation.error);
      return;
    }

    setSaving(true);
    try { await onConfirm(clampedQuantity, operationId); onClose(); }
    catch (error) { setQuantityError(error instanceof Error ? error.message : "Production non enregistrée."); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!saving) onClose(); }}
      title="Produire une recette"
      width="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Recipe Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-2xl font-bold">{recipe.name}</h3>
            <p className="text-sm text-secondary mt-1">
              {recipe.category}
            </p>
          </div>
          <Badge label={safeMaxYield > 0 ? "Stock disponible" : "Stock insuffisant"} status={safeMaxYield > 0 ? "optimal" : "urgent"} />
        </div>

        {/* Quantity Selector */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label htmlFor="production-quantity" className="block text-sm font-semibold text-blue-900 mb-2">
            Portions à produire
          </label>
          <div className="flex items-center gap-4">
            <input
              id="production-quantity"
              aria-invalid={Boolean(visibleQuantityError)}
              aria-describedby={visibleQuantityError ? "production-quantity-error" : undefined}
              type="number"
              min="1"
              max={safeMaxYield}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setQuantityError(undefined);
              }}
              className="flex-1 px-4 py-2 text-2xl font-bold border-2 border-blue-300 rounded-md text-center"
            />
            <div className="text-sm text-blue-700">
              <div>Maximum avec le stock :</div>
              <div className="font-bold text-lg">{safeMaxYield} portions</div>
            </div>
          </div>
          {visibleQuantityError && (
            <span id="production-quantity-error" role="alert" className="text-sm text-red-600 mt-2 block">{visibleQuantityError}</span>
          )}
        </div>

        {/* Economics */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">
                Coût matière estimé
              </span>
            </div>
            <p className="text-2xl font-bold">{totalCost === null ? "Indisponible" : `${totalCost.toFixed(2)} €`}</p>
            <p className="text-xs text-secondary mt-1">
              {costPerPortion === null ? "Prix d’un ingrédient indisponible" : `${costPerPortion.toFixed(2)} € / portion, aux prix catalogue`}
            </p>
          </div>
        </div>

        {/* Ingredients Check */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-optimal" />
            <h4 className="font-semibold">Ingrédients par portion</h4>
          </div>
          <div className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <div key={ing.productId} className="flex justify-between text-sm">
                <span>{getProductName(ing.productId)}</span>
                <span>{ing.quantity} {getProductUnit(ing.productId)} par portion</span>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            Le stock sera revérifié, puis les ingrédients seront déduits à la validation.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !quantityValidation.isValid}
          >
            Confirmer et déduire du stock
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionConfirmModal;
