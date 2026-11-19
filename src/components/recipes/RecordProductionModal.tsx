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
import "./ProductionDialogs.css";

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
  const [serviceSlot, setServiceSlot] = useState("");
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
      date: new Date().toISOString(), serviceSlot: serviceSlot || null,
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
      onClose={onClose}
      closeDisabled={saving}
      title="Noter une préparation hors catalogue"
      width="md"
    >
      <div className="flex flex-col gap-md production-dialog">
        <p>Cette préparation sera ajoutée au journal. Le stock ne sera pas modifié.</p>
        <label className="production-dialog-service">
          Service
          <select value={serviceSlot} onChange={(event) => setServiceSlot(event.target.value)}>
            <option value="">Non ventilé</option><option value="lunch">Midi</option><option value="dinner">Soir</option>
          </select>
        </label>
        {saveError && <p className="production-dialog-error" role="alert">{saveError}</p>}
        <Input
          id="recordproductionmodal-1"
          label="Nom du plat ou de la préparation *"
          placeholder="Ex: Tarte aux tomates"
          icon={<ChefHat size={16} aria-hidden="true" />}
          value={formData.recipeName}
          error={errors.recipeName}
          onChange={(e) => setFormData({ ...formData, recipeName: e.target.value })}
        />

        <div className="production-dialog-fields">
          <Input
            id="recordproductionmodal-2"
            label="Nombre de portions *"
            type="number"
            min="1"
            max="10000"
            step="1"
            placeholder="0"
            icon={<Users size={16} aria-hidden="true" />}
            value={formData.portions}
            error={errors.portions}
            onChange={(e) => setFormData({ ...formData, portions: e.target.value })}
          />
          <Input
            id="recordproductionmodal-3"
            label="Temps de préparation (min)"
            type="number"
            min="0"
            max="1440"
            step="1"
            placeholder="30"
            icon={<Clock size={16} aria-hidden="true" />}
            value={formData.prepTime}
            error={errors.prepTime}
            onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
          />
        </div>

        <div className="input-wrapper">
          <label htmlFor="recordproductionmodal-4" className="input-label">
            Notes facultatives
          </label>
          <textarea id="recordproductionmodal-4"
            rows={3}
            placeholder="Précisions utiles pour l’équipe"
            value={formData.notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "record-notes-error" : undefined}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
          {errors.notes && (
            <span id="record-notes-error" className="production-dialog-error" role="alert">{errors.notes}</span>
          )}
        </div>

        <div className="modal-actions">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
          >
            Ajouter au journal
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecordProductionModal;
