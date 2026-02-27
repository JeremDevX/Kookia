import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import { ChefHat, Clock, Users } from "lucide-react";
import type { ProductionRecord } from "../../types/callbacks";

interface RecordProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (data: ProductionRecord) => void;
}

const RecordProductionModal: React.FC<RecordProductionModalProps> = ({
  isOpen,
  onClose,
  onRecord,
}) => {
  const [formData, setFormData] = useState({
    recipeName: "",
    portions: "",
    prepTime: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (formData.recipeName && formData.portions) {
      onRecord({
        ...formData,
        date: new Date().toISOString(),
      });
      setFormData({
        recipeName: "",
        portions: "",
        prepTime: "",
        notes: "",
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enregistrer une production"
      width="md"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nom de la recette *
          </label>
          <Input
            placeholder="Ex: Tarte aux tomates"
            icon={<ChefHat size={16} />}
            value={formData.recipeName}
            onChange={(e) =>
              setFormData({ ...formData, recipeName: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre de portions *
            </label>
            <Input
              type="number"
              placeholder="0"
              icon={<Users size={16} />}
              value={formData.portions}
              onChange={(e) =>
                setFormData({ ...formData, portions: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Temps de préparation (min)
            </label>
            <Input
              type="number"
              placeholder="30"
              icon={<Clock size={16} />}
              value={formData.prepTime}
              onChange={(e) =>
                setFormData({ ...formData, prepTime: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Notes (optionnel)
          </label>
          <textarea
            className="w-full px-3 py-2 border rounded-md resize-none"
            rows={3}
            placeholder="Remarques sur la production..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
          <strong>Info:</strong> Cette production sera enregistrée dans votre
          historique et l'IA utilisera ces données pour améliorer les
          prévisions.
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.recipeName || !formData.portions}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecordProductionModal;
