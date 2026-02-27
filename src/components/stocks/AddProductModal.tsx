import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import { Package, DollarSign, AlertCircle } from "lucide-react";
import type { NewProduct } from "../../types/callbacks";
import type { Unit } from "../../types";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: NewProduct) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "Légumes",
    currentStock: "",
    unit: "kg" as Unit,
    minThreshold: "",
    pricePerUnit: "",
  });

  const handleSubmit = () => {
    if (formData.name && formData.currentStock && formData.pricePerUnit) {
      onAdd({
        id: `p${Date.now()}`,
        name: formData.name,
        category: formData.category,
        currentStock: Number(formData.currentStock),
        unit: formData.unit,
        minThreshold: Number(formData.minThreshold) || 10,
        supplierId: "sup1",
        pricePerUnit: Number(formData.pricePerUnit),
      });
      setFormData({
        name: "",
        category: "Légumes",
        currentStock: "",
        unit: "kg",
        minThreshold: "",
        pricePerUnit: "",
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un nouveau produit"
      width="md"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nom du produit *
          </label>
          <Input
            placeholder="Ex: Tomates cerises"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Catégorie</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              <option value="Légumes">Légumes</option>
              <option value="Fromages">Fromages</option>
              <option value="Frais">Frais</option>
              <option value="Viandes">Viandes</option>
              <option value="Epicerie">Epicerie</option>
              <option value="Charcuterie">Charcuterie</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Unité</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value as Unit })
              }
            >
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
              <option value="dz">dz</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Stock initial *
            </label>
            <Input
              type="number"
              placeholder="0"
              icon={<Package size={16} />}
              value={formData.currentStock}
              onChange={(e) =>
                setFormData({ ...formData, currentStock: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Seuil minimum
            </label>
            <Input
              type="number"
              placeholder="10"
              icon={<AlertCircle size={16} />}
              value={formData.minThreshold}
              onChange={(e) =>
                setFormData({ ...formData, minThreshold: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Prix unitaire (€) *
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            icon={<DollarSign size={16} />}
            value={formData.pricePerUnit}
            onChange={(e) =>
              setFormData({ ...formData, pricePerUnit: e.target.value })
            }
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
          <strong>Note:</strong> Le produit sera automatiquement ajouté à votre
          inventaire et l'IA commencera à analyser les tendances de
          consommation.
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.name || !formData.currentStock || !formData.pricePerUnit
            }
          >
            Ajouter le produit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddProductModal;
