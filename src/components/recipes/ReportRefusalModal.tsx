import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import type { Recipe } from "../../types";

interface ReportRefusalModalProps {
  recipe: Recipe;
  onClose: () => void;
  onConfirm: (recipe: Recipe, portions: number, operationId: string) => Promise<void>;
}

export default function ReportRefusalModal({ recipe, onClose, onConfirm }: ReportRefusalModalProps) {
  const [quantity, setQuantity] = useState("");
  const [operationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const portions = Number(quantity);
  const valid = /^\d+$/.test(quantity) && portions >= 1 && portions <= 10_000;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(recipe, portions, operationId);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Signaler des demandes refusées" width="sm">
    <div className="flex flex-col gap-4">
      <p>{recipe.name} · Ce signalement ne déduit aucun ingrédient du stock.</p>
      <label htmlFor="refused-portions">Nombre de demandes refusées</label>
      <p id="refusal-hint">Entre 1 et 10 000 demandes. Aucun ingrédient ne sera déduit.</p>
      <input id="refused-portions" className="input-field" type="number" min="1" max="10000" step="1"
        value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }}
        aria-invalid={Boolean(error)} aria-describedby={error ? "refusal-hint refusal-error" : "refusal-hint"} />
      {error && <p id="refusal-error" role="alert">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button onClick={() => void submit()} disabled={!valid || saving}>Enregistrer le refus</Button>
      </div>
    </div>
  </Modal>;
}
