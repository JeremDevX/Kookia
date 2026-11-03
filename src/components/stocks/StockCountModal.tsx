import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";
import "./StockCountModal.css";
import type { Product } from "../../types";
import type { NewStockCount, StockCountResult } from "../../services/productService";

interface StockCountModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<boolean>;
  onSave: (productId: string, count: NewStockCount) => Promise<StockCountResult>;
}

const StockCountModal = ({ product, isOpen, onClose, onRefresh, onSave }: StockCountModalProps) => {
  const [countedQuantity, setCountedQuantity] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [expectedStockRevision, setExpectedStockRevision] = useState(product.stockRevision);
  const [expectedStock, setExpectedStock] = useState(product.currentStock);
  const [expectedUnit, setExpectedUnit] = useState(product.unit);
  const [saving, setSaving] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  const resetCount = useEffectEvent(() => {
    setCountedQuantity(""); setOperationId(crypto.randomUUID());
    setExpectedStockRevision(product.stockRevision); setExpectedStock(product.currentStock); setExpectedUnit(product.unit);
    setError("");
  });
  useEffect(() => {
    if (isOpen) resetCount();
  }, [isOpen, product.id]);

  const close = () => { if (!busyRef.current) onClose(); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    const normalized = countedQuantity.trim().replace(",", ".");
    const quantity = Number(normalized);
    if (!/^(?:\d+|\d+\.\d{1,3})$/.test(normalized) || !Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) {
      setError("Entrez une quantité comptée positive ou nulle, avec trois décimales au maximum."); return;
    }
    busyRef.current = true; setSaving(true); setError("");
    try {
      await onSave(product.id, { operationId, expectedStockRevision, expectedUnit, countedQuantity: quantity });
      setSaving(false); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le comptage n’a pas été enregistré.");
    } finally { busyRef.current = false; setSaving(false); }
  };

  const reload = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setSaving(true);
    try {
      if (await onRefresh()) onClose();
      else setError("Rechargement impossible. Votre quantité est conservée ; réessayez.");
    } catch {
      setError("Rechargement impossible. Votre quantité est conservée ; réessayez.");
    } finally { busyRef.current = false; setSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={close} closeDisabled={saving} title={`Compter ${product.name}`}>
    <form onSubmit={(event) => void submit(event)} className="stock-count-form">
      <p role="status">Stock théorique à l’ouverture : <strong>{expectedStock} {expectedUnit}</strong>. Le comptage est daté par le serveur au jour courant Europe/Paris.</p>
      <Input id="physical-stock-count" label={`Quantité réellement comptée (${expectedUnit})`} type="number" min="0" max="1000000" step="0.001" value={countedQuantity} disabled={saving} onChange={(event) => setCountedQuantity(event.target.value)} required />
      <p className="text-sm text-secondary">Si le stock change avant validation, le comptage sera refusé et devra être repris après rechargement.</p>
      {error && <div role="alert"><p>{error}</p><Button type="button" size="sm" variant="outline" onClick={() => void reload()} disabled={saving}>Recharger la fiche</Button></div>}
      <div className="stock-count-actions"><Button type="button" variant="secondary" onClick={close} disabled={saving}>Annuler</Button><Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le comptage"}</Button></div>
    </form>
  </Modal>;
};

export default StockCountModal;
