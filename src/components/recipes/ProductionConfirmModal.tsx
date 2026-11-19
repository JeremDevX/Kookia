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
import { productionIngredientAmount } from "../../domain/recipes/productionIngredientAmount";
import "./ProductionDialogs.css";

interface ProductionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  maxYield: number;
  initialPortions?: number;
  availabilityWarnings?: string[];
  costPerPortion: number | null;
  getProductName: (productId: string) => string;
  getProductUnit: (productId: string) => string;
  onConfirm: (quantity: number, operationId: string, serviceSlot: string | null) => Promise<void>;
}

const ProductionConfirmModal: React.FC<ProductionConfirmModalProps> = ({
  isOpen,
  onClose,
  recipe,
  maxYield,
  initialPortions = 1,
  availabilityWarnings = [],
  costPerPortion,
  getProductName,
  getProductUnit,
  onConfirm,
}) => {
  const [serviceSlot, setServiceSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const [operationId] = useState(() => crypto.randomUUID());
  const safeMaxYield = Math.min(10_000, Math.max(0, maxYield));
  const [quantity, setQuantity] = useState(String(initialPortions));
  const [quantityError, setQuantityError] = useState<string | undefined>();

  if (!recipe) return null;

  const quantityValidation = validateProductionQuantity(quantity, safeMaxYield);
  const clampedQuantity = quantityValidation.normalizedQuantity;
  const amounts = quantityValidation.isValid ? recipe.ingredients.map((ing) =>
    productionIngredientAmount(ing.quantity, clampedQuantity, recipe.yieldPortions, ing.unit || getProductUnit(ing.productId))) : [];
  const precisionError = amounts.includes(null) ? "Les portions choisies génèrent une fraction de pièce ou une quantité inférieure à la précision du stock. Ajustez les portions." : undefined;
  const visibleQuantityError = quantityError ?? (quantity && !quantityValidation.isValid ? quantityValidation.error : precisionError);

  const totalCost = costPerPortion === null ? null : costPerPortion * clampedQuantity;

  const handleConfirm = async () => {
    if (saving) return;
    if (!quantityValidation.isValid || precisionError) {
      setQuantityError(quantityValidation.error ?? precisionError);
      return;
    }

    setSaving(true);
    try { await onConfirm(clampedQuantity, operationId, serviceSlot || null); onClose(); }
    catch (error) { setQuantityError(error instanceof Error ? error.message : "Production non enregistrée."); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={saving}
      title="Produire une recette"
      width="lg"
    >
      <div className="flex flex-col gap-md production-dialog">
        {/* Recipe Header */}
        <div className="production-dialog-heading">
          <div>
            <h3>{recipe.name}</h3>
            <p className="production-dialog-detail">
              {recipe.category} · version {recipe.version} · effet {recipe.effectiveFrom ?? "historique inconnu"}
            </p>
          </div>
          <Badge label={safeMaxYield > 0 ? "Stock disponible" : "Stock insuffisant"} status={safeMaxYield > 0 ? "optimal" : "urgent"} />
        </div>

        <label className="production-dialog-service">
          Service
          <select value={serviceSlot} onChange={(event) => setServiceSlot(event.target.value)}>
            <option value="">Non ventilé</option><option value="lunch">Midi</option><option value="dinner">Soir</option>
          </select>
        </label>
        {/* Quantity Selector */}
        <div className="flex flex-col gap-sm production-dialog-panel">
          <label htmlFor="production-quantity" className="input-label">Portions à produire</label>
          <div className="flex items-center gap-md production-quantity-row">
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
              className={visibleQuantityError ? "input-field has-error" : "input-field"}
            />
            <div className="production-dialog-detail">
              <div>Maximum avec les lots proposés :</div>
              <strong>{safeMaxYield} portions</strong>
            </div>
          </div>
          {visibleQuantityError && (
            <span id="production-quantity-error" role="alert" className="production-dialog-error">{visibleQuantityError}</span>
          )}
        </div>
        {availabilityWarnings.length > 0 && <ul className="production-dialog-warnings">{availabilityWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}

        {/* Economics */}
        <div className="production-dialog-panel">
          <h4 className="flex items-center gap-sm"><Package size={16} aria-hidden="true" />Coût matière estimé</h4>
          <p><strong>{totalCost === null ? "Indisponible" : `${totalCost.toFixed(2)} €`}</strong></p>
          <p className="production-dialog-detail">
            {costPerPortion === null ? "Prix d’un ingrédient indisponible" : `${costPerPortion.toFixed(2)} € / portion, aux prix catalogue`}
          </p>
        </div>

        {/* Ingredients Check */}
        <div className="flex flex-col gap-sm production-dialog-panel">
          <h4 className="flex items-center gap-sm"><CheckCircle size={18} className="text-optimal" aria-hidden="true" />Ingrédients à déduire</h4>
          <ul className="production-dialog-ingredients">
            {recipe.ingredients.map((ing, index) => (
              <li key={ing.productId} className="flex justify-between gap-sm">
                <span>{ing.productName || getProductName(ing.productId)}</span>
                <span>{amounts[index] == null ? "—" : `${amounts[index]} ${ing.unit || getProductUnit(ing.productId)}`}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        <p className="flex items-start gap-sm production-dialog-panel production-dialog-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Le stock sera revérifié, puis les ingrédients seront déduits à la validation.</span>
        </p>

        {/* Actions */}
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !quantityValidation.isValid || Boolean(precisionError)}
          >
            Confirmer et déduire du stock
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProductionConfirmModal;
