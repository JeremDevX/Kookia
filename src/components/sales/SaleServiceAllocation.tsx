import { useEffect, useState, type FormEvent } from "react";
import Button from "../common/Button";
import { getSaleAllocation, saveSaleAllocation } from "../../services/serviceCalendarService";
import type { SaleAllocation } from "../../../shared/serviceCalendar";
import type { DailySale } from "../../services/salesService";

export default function SaleServiceAllocation({ sale, onChanged }: { sale: DailySale; onChanged: () => void }) {
  const [allocation, setAllocation] = useState<SaleAllocation | null>(null);
  const [lunch, setLunch] = useState(0);
  const [dinner, setDinner] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    getSaleAllocation(sale.id).then((result) => {
      if (!active) return;
      setAllocation(result); setLunch(result.lunchQuantity); setDinner(result.dinnerQuantity); setError("");
    }, (cause) => { if (active) setError(cause instanceof Error ? cause.message : "Ventilation indisponible."); });
    return () => { active = false; };
  }, [open, sale.id, sale.revision, reload]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!allocation) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const result = await saveSaleAllocation(sale.id, { lunchQuantity: lunch, dinnerQuantity: dinner,
        expectedRevision: allocation.revision, expectedSaleRevision: sale.revision });
      setAllocation(result); setStatus("Ventilation enregistrée ; aucun stock modifié."); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  return <details onToggle={(event) => setOpen(event.currentTarget.open)}><summary>Attribuer à midi / soir</summary>
    {open && <form onSubmit={(event) => void submit(event)}>
      <p>Répartissez uniquement les ventes réellement connues. Le solde reste non ventilé.</p>
      {!allocation && !error && <p role="status">Chargement de la ventilation…</p>}
      {allocation?.needsReview && <p role="status">La vente a changé : l’ancienne ventilation n’est plus utilisée. Confirmez les quantités.</p>}
      <label>Midi (unités)<input type="number" required min="0" max={sale.quantity} step="1" value={lunch} onChange={(event) => setLunch(Number(event.target.value))} /></label>
      <label>Soir (unités)<input type="number" required min="0" max={sale.quantity} step="1" value={dinner} onChange={(event) => setDinner(Number(event.target.value))} /></label>
      <p>Non ventilées : {sale.quantity - lunch - dinner} unités.</p>
      <Button type="submit" size="sm" disabled={busy || !allocation || lunch + dinner > sale.quantity}>{busy ? "Enregistrement…" : "Confirmer l’attribution"}</Button>
    </form>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setReload((current) => current + 1)}>Recharger la ventilation</button></p>}{status && <p role="status">{status}</p>}
  </details>;
}
