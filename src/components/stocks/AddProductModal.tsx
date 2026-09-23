import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import { Package, DollarSign, AlertCircle } from "lucide-react";
import type { NewProduct } from "../../types/callbacks";
import type { Supplier, Unit } from "../../types";
import {
  validateAddProductForm,
  type AddProductFormErrors,
} from "../../utils/formValidation";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: NewProduct) => Promise<void>;
  suppliers: Supplier[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  suppliers,
}) => {
  const [supplierId, setSupplierId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [formData, setFormData] = useState({
    name: "",
    category: "Légumes",
    currentStock: "",
    unit: "kg" as Unit,
    minThreshold: "",
    pricePerUnit: "",
  });
  const [errors, setErrors] = useState<AddProductFormErrors>({});

  const handleSubmit = async () => {
    if (saving) return;
    const validation = validateAddProductForm(formData);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    const minThreshold = formData.minThreshold.trim()
      ? Number(formData.minThreshold.trim())
      : 10;

    setSaving(true);
    setSaveError("");
    try {
    await onAdd({
      id: operationId,
      name: formData.name.trim(),
      category: formData.category,
      currentStock: Number(formData.currentStock),
      unit: formData.unit,
      minThreshold,
      supplierId: supplierId || suppliers[0]?.id || "",
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
    setErrors({});
    setOperationId(crypto.randomUUID());
    onClose();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Enregistrement impossible."); } finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un produit"
      width="md"
    >
      <div className="flex flex-col gap-4">
        {saveError && <p role="alert">{saveError}</p>}
        {suppliers.length === 0 && <p role="status">Aucun fournisseur disponible. L’ajout d’un produit est indisponible.</p>}
        <div><label htmlFor="product-supplier">Fournisseur</label><select id="product-supplier" value={supplierId || suppliers[0]?.id || ""} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <div>
          <label htmlFor="addproductmodal-1" className="block text-sm font-medium mb-2">
            Nom du produit *
          </label>
          <Input id="addproductmodal-1"
            placeholder="Ex. : tomates cerises"
            value={formData.name}
            error={errors.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="addproductmodal-2" className="block text-sm font-medium mb-2">Catégorie</label>
            <select id="addproductmodal-2"
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
            <label htmlFor="addproductmodal-3" className="block text-sm font-medium mb-2">Unité</label>
            <select id="addproductmodal-3"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value as Unit })
              }
            >
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="pcs">pièces (pcs)</option>
              <option value="dz">douzaines (dz)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="addproductmodal-4" className="block text-sm font-medium mb-2">
              Stock initial *
            </label>
            <Input id="addproductmodal-4"
              type="number"
              min="0"
              step="0.001"
              placeholder="0"
              icon={<Package size={16} />}
              value={formData.currentStock}
              error={errors.currentStock}
              onChange={(e) =>
                setFormData({ ...formData, currentStock: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="addproductmodal-5" className="block text-sm font-medium mb-2">
              Seuil d’alerte (10 par défaut)
            </label>
            <Input id="addproductmodal-5"
              type="number"
              min="0"
              step="1"
              placeholder="10"
              icon={<AlertCircle size={16} />}
              value={formData.minThreshold}
              error={errors.minThreshold}
              onChange={(e) =>
                setFormData({ ...formData, minThreshold: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label htmlFor="addproductmodal-6" className="block text-sm font-medium mb-2">
            Prix unitaire (€) *
          </label>
            <Input id="addproductmodal-6"
              type="number"
              min="0"
              step="0.0001"
            placeholder="0.00"
            icon={<DollarSign size={16} />}
            value={formData.pricePerUnit}
            error={errors.pricePerUnit}
            onChange={(e) =>
              setFormData({ ...formData, pricePerUnit: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit} disabled={saving || suppliers.length === 0 || !validateAddProductForm(formData).isValid}
          >
            Ajouter le produit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddProductModal;
