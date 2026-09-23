import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import { ChefHat, Clock, Users } from "lucide-react";
import type { ProductionRecord } from "../../types/callbacks";
import {
  validateRecordProductionForm,
  type RecordProductionFormErrors,
} from "../../utils/formValidation";

interface RecordProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (data: ProductionRecord, operationId: string) => Promise<void>;
}

const RecordProductionModal: React.FC<RecordProductionModalProps> = ({
  isOpen,
  onClose,
  onRecord,
}) => {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [formData, setFormData] = useState({
    recipeName: "",
    portions: "",
    prepTime: "",
    notes: "",
  });
  const [errors, setErrors] = useState<RecordProductionFormErrors>({});

  const handleSubmit = async () => {
    if (saving) return;
    const validation = validateRecordProductionForm(formData);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
    await onRecord({
      recipeName: formData.recipeName.trim(),
      portions: formData.portions.trim(),
      prepTime: formData.prepTime.trim(),
      notes: formData.notes.trim(),
      date: new Date().toISOString(),
    }, operationId);
    setFormData({
      recipeName: "",
      portions: "",
      prepTime: "",
      notes: "",
    });
    setErrors({});
    setOperationId(crypto.randomUUID());
    onClose();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Enregistrement impossible."); } finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!saving) onClose(); }}
      title="Enregistrer une production"
      width="md"
    >
      <div className="flex flex-col gap-4">
        <p>Cette déclaration conserve votre production. Sans recette liée, aucun ingrédient ne sera déduit du stock.</p>
        {saveError && <p role="alert">{saveError}</p>}
        <div>
          <label htmlFor="recordproductionmodal-1" className="block text-sm font-medium mb-2">
            Nom de la recette *
          </label>
          <Input id="recordproductionmodal-1"
            placeholder="Ex: Tarte aux tomates"
            icon={<ChefHat size={16} />}
            value={formData.recipeName}
            error={errors.recipeName}
            onChange={(e) =>
              setFormData({ ...formData, recipeName: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="recordproductionmodal-2" className="block text-sm font-medium mb-2">
              Nombre de portions *
            </label>
          <Input id="recordproductionmodal-2"
              type="number"
              min="1"
              max="10000"
              step="1"
              placeholder="0"
              icon={<Users size={16} />}
              value={formData.portions}
              error={errors.portions}
              onChange={(e) =>
                setFormData({ ...formData, portions: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="recordproductionmodal-3" className="block text-sm font-medium mb-2">
              Temps de préparation (min)
            </label>
          <Input id="recordproductionmodal-3"
              type="number"
              min="0"
              max="1440"
              step="1"
              placeholder="30"
              icon={<Clock size={16} />}
              value={formData.prepTime}
              error={errors.prepTime}
              onChange={(e) =>
                setFormData({ ...formData, prepTime: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label htmlFor="recordproductionmodal-4" className="block text-sm font-medium mb-2">
            Notes (optionnel)
          </label>
          <textarea id="recordproductionmodal-4"
            className="w-full px-3 py-2 border rounded-md resize-none"
            rows={3}
            placeholder="Remarques sur la production..."
            value={formData.notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "record-notes-error" : undefined}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
          {errors.notes && (
            <span id="record-notes-error" className="text-sm text-red-600 mt-1 block">{errors.notes}</span>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
          <strong>Info :</strong> Cette production sera enregistrée dans votre
          journal. Elle ne modifie pas le stock et n’alimente pas de moteur de prévision connecté.
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecordProductionModal;
