import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";
import type { Product, Supplier } from "../../types";
import type { ProductEdit } from "../../services/productService";

interface EditProductModalProps {
  product: Product;
  suppliers: Supplier[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, edit: ProductEdit) => Promise<Product>;
}

const EditProductModal = ({ product, suppliers, isOpen, onClose, onSave }: EditProductModalProps) => {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [minThreshold, setMinThreshold] = useState(String(product.minThreshold));
  const [supplierId, setSupplierId] = useState(product.supplierId);
  const [pricePerUnit, setPricePerUnit] = useState(String(product.pricePerUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(product.name); setCategory(product.category); setMinThreshold(String(product.minThreshold));
    setSupplierId(product.supplierId); setPricePerUnit(String(product.pricePerUnit)); setError("");
  }, [isOpen, product.id, product.name, product.category, product.minThreshold, product.supplierId, product.pricePerUnit, product.revision]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const threshold = Number(minThreshold.trim().replace(",", "."));
    const price = Number(pricePerUnit.trim().replace(",", "."));
    if (!name.trim() || !category.trim() || !Number.isFinite(threshold) || threshold < 0 ||
        !Number.isFinite(price) || price < 0 || !supplierId) {
      setError("Vérifiez le nom, la catégorie, le fournisseur, le seuil et le prix."); return;
    }
    setSaving(true); setError("");
    try {
      await onSave(product.id, { expectedRevision: product.revision, name: name.trim(), category: category.trim(),
        minThreshold: threshold, supplierId, pricePerUnit: price });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La fiche n’a pas été modifiée.");
    } finally { setSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title={`Modifier ${product.name}`}>
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <Input id="edit-product-name" label="Nom" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required />
      <Input id="edit-product-category" label="Catégorie" value={category} maxLength={80} onChange={(event) => setCategory(event.target.value)} required />
      <label className="block text-sm font-medium" htmlFor="edit-product-supplier">Fournisseur</label>
      <select id="edit-product-supplier" className="w-full px-3 py-2 border rounded-md" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
      </select>
      <Input id="edit-product-threshold" label={`Seuil d’alerte (${product.unit})`} type="number" min="0" max="1000000" step="0.001" value={minThreshold} onChange={(event) => setMinThreshold(event.target.value)} required />
      <Input id="edit-product-price" label={`Prix unitaire par ${product.unit} (€)`} type="number" min="0" max="1000000" step="0.0001" value={pricePerUnit} onChange={(event) => setPricePerUnit(event.target.value)} required />
      <p className="text-sm text-secondary">L’unité ({product.unit}) ne se modifie pas ici : les mouvements et recettes existants en dépendent.</p>
      {error && <p role="alert">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Annuler</Button><Button type="submit" disabled={saving || suppliers.length === 0}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
    </form>
  </Modal>;
};

export default EditProductModal;
