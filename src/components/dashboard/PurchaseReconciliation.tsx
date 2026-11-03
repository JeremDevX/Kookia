import { useEffect, useState, type FormEvent } from "react";
import { getPurchaseReconciliation, recordPurchaseCredit, type PurchaseCreditInput, type PurchaseReconciliation as Reconciliation } from "../../services/orderService";
import { useAuth } from "../../features/auth/context/AuthContext";
import { definitiveCreditError, duplicateCreditError, readPendingCredit, submitPendingCredit } from "../../features/orders/pendingCredit";
import { getInventoryWorkspace } from "../../services/inventorySessionService";
import Button from "../common/Button";
import Input from "../common/Input";

export default function PurchaseReconciliation(props: { orderId: string; disabled: boolean }) {
  const { user } = useAuth();
  return user ? <AccountPurchaseReconciliation key={user.id} {...props} userId={user.id} /> : null;
}

export function AccountPurchaseReconciliation({ orderId, disabled, userId }: { orderId: string; disabled: boolean; userId: string }) {
  const [data, setData] = useState<Reconciliation | null>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [pending, setPending] = useState<PurchaseCreditInput | null>(null);
  const [blocked, setBlocked] = useState(false);
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
    setData(null); setRestaurantId(""); setPending(null); setBlocked(false);
    void getInventoryWorkspace().then(async (workspace) => {
      const saved = readPendingCredit(userId, workspace.restaurantId, orderId);
      if (!active) return;
      setRestaurantId(workspace.restaurantId); setPending(saved);
      const value = await getPurchaseReconciliation(orderId, workspace.restaurantId);
      if (active) { setData(value); setError(""); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Pièces indisponibles."); }
    });
    return () => { active = false; };
  }, [orderId, reload, userId]);
  const change = (update: () => void) => { update(); setOperationId(crypto.randomUUID()); };
  async function save(input: PurchaseCreditInput, resume: boolean) {
    if (!restaurantId || disabled || saving || blocked) return;
    setSaving(true); setError(""); setNotice("");
    let sent = false;
    try {
      await submitPendingCredit(userId, restaurantId, orderId, input, resume, () => setPending(input),
        () => { sent = true; return recordPurchaseCredit(input, restaurantId); });
      setPending(null); setNotice("Avoir rapproché. Le stock reste inchangé."); setReload((value) => value + 1);
      setReference(""); setAmount(""); setReason(""); setOperationId(crypto.randomUUID());
    } catch (cause) {
      try {
        const saved = readPendingCredit(userId, restaurantId, orderId);
        setPending(saved);
        if (!saved && ((resume && !duplicateCreditError(cause)) || (sent && !definitiveCreditError(cause)))) setBlocked(true);
        if (!saved && duplicateCreditError(cause)) { setNotice(cause instanceof Error ? cause.message : "Cet avoir est déjà enregistré."); setReload((value) => value + 1); }
        setError(saved ? "Enregistrement incertain. Vérifiez l’avoir avant de continuer." :
          cause instanceof Error ? cause.message : "Enregistrement impossible.");
      } catch (storageError) {
        setBlocked(true); setError(storageError instanceof Error ? storageError.message : "Vérification de l’avoir impossible.");
      }
    } finally { setSaving(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault(); if (!data || pending) return;
    void save({ operationId, receiptId, reference, amount: Number(amount), reason }, false);
  }
  return <details><summary>Chaîne commande → livraison → facture → avoir</summary>
    {error && <p role="alert">{error} {!data && <Button type="button" variant="outline" onClick={() => { setError(""); setReload((value) => value + 1); }}>Réessayer</Button>}</p>}
    {notice && <p role="status">{notice}</p>}
    {!data && !error && <p role="status">Chargement des pièces…</p>}
    {pending && <div role="status"><p>Un avoir reste à vérifier : {pending.reference}, {pending.amount.toFixed(2)} € · {pending.reason}</p>
      <Button type="button" disabled={disabled || saving || blocked} onClick={() => void save(pending, true)}>{saving ? "Vérification…" : "Vérifier l’enregistrement"}</Button></div>}
    {data && <><ul>{data.receipts.map((receipt) => <li key={receipt.receiptId}>
      Livraison {receipt.deliveryReference} du {receipt.deliveryDate} → facture {receipt.invoiceReference} ({receipt.invoiceComplete ? "rapprochée" : "à compléter"})
      <ul>{receipt.credits.map((credit) => <li key={credit.id}>Avoir {credit.reference} : {credit.amount.toFixed(2)} € · {credit.reason}</li>)}</ul>
    </li>)}</ul>{data.receipts.length === 0 && <p>Aucune livraison rapprochée pour cette commande.</p>}
    {data.assumptions.map((assumption) => <p key={assumption}>{assumption}</p>)}
    {!pending && !blocked && data.receipts.some((receipt) => !receipt.simulated) && <form onSubmit={(event) => void submit(event)} className="purchase-credit-form">
      <h4>Rapprocher un avoir reçu</h4>
      <label className="input-wrapper" htmlFor={`credit-receipt-${orderId}`}><span className="input-label">Livraison / facture concernée</span>
      <select className="input-field" id={`credit-receipt-${orderId}`} required disabled={disabled || saving} value={receiptId} onChange={(event) => change(() => setReceiptId(event.target.value))}><option value="">Choisir</option>{data.receipts.filter((receipt) => !receipt.simulated).map((receipt) => <option key={receipt.receiptId} value={receipt.receiptId}>{receipt.deliveryReference} · {receipt.invoiceReference}</option>)}</select></label>
      <Input id={`credit-ref-${orderId}`} label="Référence de l’avoir" required maxLength={120} value={reference} disabled={disabled || saving} onChange={(event) => change(() => setReference(event.target.value))} />
      <Input id={`credit-amount-${orderId}`} label="Montant de l’avoir (€)" type="number" min="0.01" max="1000000" step="0.01" required value={amount} disabled={disabled || saving} onChange={(event) => change(() => setAmount(event.target.value))} />
      <Input id={`credit-reason-${orderId}`} label="Motif et rapprochement" required maxLength={500} value={reason} disabled={disabled || saving} onChange={(event) => change(() => setReason(event.target.value))} />
      <Button type="submit" disabled={disabled || saving || !receiptId}>{saving ? "Enregistrement…" : "Confirmer l’avoir rapproché"}</Button>
    </form>}</>}
  </details>;
}
