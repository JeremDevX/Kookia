import { useState, type FormEvent } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { updatePurchaseDelivery, type PurchaseOrder } from "../../services/orderService";

export default function PurchaseDeliveryReview({ order, onSaved, disabled }: { order: PurchaseOrder; onSaved: () => void; disabled: boolean }) {
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const line = order.lines.find((item) => item.id === selected);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!line || saving || disabled) return;
    setSaving(true); setError("");
    try {
      await updatePurchaseDelivery(line.id, { operationId, expectedRevision: line.deliveryRevision ?? 0, expectedDeliveryDate: date || null, note });
      setOperationId(crypto.randomUUID()); setSelected(""); setNote(""); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Report non enregistré."); }
    finally { setSaving(false); }
  }
  return <details><summary>Confirmer une date ou signaler un report fournisseur</summary>
    <p>Une date attendue n’est pas une réception : le stock reste inchangé. Le report ajuste les besoins conditionnels, sans modifier la commande.</p>
    <form onSubmit={(event) => void submit(event)} className="form-grid">
      <label htmlFor={`delivery-line-${order.id}`}>Produit / fournisseur</label>
      <select id={`delivery-line-${order.id}`} value={selected} disabled={disabled || saving} required onChange={(event) => {
        setSelected(event.target.value); setDate(order.lines.find((item) => item.id === event.target.value)?.expectedDeliveryDate ?? ""); setOperationId(crypto.randomUUID());
      }}><option value="">Choisir</option>{order.lines.filter((item) => item.remainingQuantity > 0).map((item) => <option key={item.id} value={item.id}>{item.productName} · {item.supplierName}</option>)}</select>
      <Input id={`delivery-date-${order.id}`} label="Livraison attendue (Europe/Paris), vide si inconnue" type="date" value={date} disabled={disabled || saving} onChange={(event) => { setDate(event.target.value); setOperationId(crypto.randomUUID()); }} />
      <Input id={`delivery-note-${order.id}`} label="Confirmation / motif du report" value={note} maxLength={500} required disabled={disabled || saving} onChange={(event) => { setNote(event.target.value); setOperationId(crypto.randomUUID()); }} />
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={disabled || saving || !line || !note.trim()}>{saving ? "Enregistrement…" : "Confirmer le suivi fournisseur"}</Button>
    </form>
  </details>;
}
