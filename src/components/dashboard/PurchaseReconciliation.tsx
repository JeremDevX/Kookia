import { useEffect, useState, type FormEvent } from "react";
import { getPurchaseReconciliation, recordPurchaseCredit, type PurchaseReconciliation as Reconciliation } from "../../services/orderService";
import Button from "../common/Button";
import Input from "../common/Input";

export default function PurchaseReconciliation({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const [data, setData] = useState<Reconciliation | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [receiptId, setReceiptId] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true;
    getPurchaseReconciliation(orderId).then((value) => { if (active) { setData(value); setError(""); } },
      (cause: unknown) => { if (active) { setData(null); setError(cause instanceof Error ? cause.message : "Pièces indisponibles."); } });
    return () => { active = false; };
  }, [orderId, reload]);
  const change = (update: () => void) => { update(); setOperationId(crypto.randomUUID()); };
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!data || disabled || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await recordPurchaseCredit({ operationId, receiptId, reference, amount: Number(amount), reason });
      setNotice("Avoir rapproché. Le stock reste inchangé."); setReload((value) => value + 1); setReference(""); setAmount(""); setReason(""); setOperationId(crypto.randomUUID());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Avoir non enregistré."); }
    finally { setSaving(false); }
  }
  return <details><summary>Chaîne commande → livraison → facture → avoir</summary>
    {error && <p role="alert">{error} <Button type="button" variant="outline" onClick={() => setReload((value) => value + 1)}>Réessayer</Button></p>}
    {notice && <p role="status">{notice}</p>}
    {!data && !error && <p role="status">Chargement des pièces…</p>}
    {data && <><ul>{data.receipts.map((receipt) => <li key={receipt.receiptId}>
      Livraison {receipt.deliveryReference} du {receipt.deliveryDate} → facture {receipt.invoiceReference} ({receipt.invoiceComplete ? "rapprochée" : "à compléter"})
      <ul>{receipt.credits.map((credit) => <li key={credit.id}>Avoir {credit.reference} : {credit.amount.toFixed(2)} € · {credit.reason}</li>)}</ul>
    </li>)}</ul>{data.receipts.length === 0 && <p>Aucune livraison rapprochée pour cette commande.</p>}
    {data.assumptions.map((assumption) => <p key={assumption}>{assumption}</p>)}
    {data.receipts.some((receipt) => !receipt.simulated) && <form onSubmit={(event) => void submit(event)} className="form-grid">
      <h4>Rapprocher un avoir reçu</h4>
      <label htmlFor={`credit-receipt-${orderId}`}>Livraison / facture concernée</label>
      <select id={`credit-receipt-${orderId}`} required disabled={disabled || saving} value={receiptId} onChange={(event) => change(() => setReceiptId(event.target.value))}><option value="">Choisir</option>{data.receipts.filter((receipt) => !receipt.simulated).map((receipt) => <option key={receipt.receiptId} value={receipt.receiptId}>{receipt.deliveryReference} · {receipt.invoiceReference}</option>)}</select>
      <Input id={`credit-ref-${orderId}`} label="Référence de l’avoir" required maxLength={120} value={reference} disabled={disabled || saving} onChange={(event) => change(() => setReference(event.target.value))} />
      <Input id={`credit-amount-${orderId}`} label="Montant de l’avoir (€)" type="number" min="0.01" max="1000000" step="0.01" required value={amount} disabled={disabled || saving} onChange={(event) => change(() => setAmount(event.target.value))} />
      <Input id={`credit-reason-${orderId}`} label="Motif et rapprochement" required maxLength={500} value={reason} disabled={disabled || saving} onChange={(event) => change(() => setReason(event.target.value))} />
      <Button type="submit" disabled={disabled || saving || !receiptId}>{saving ? "Enregistrement…" : "Confirmer l’avoir rapproché"}</Button>
    </form>}</>}
  </details>;
}
