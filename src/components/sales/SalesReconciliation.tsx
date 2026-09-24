import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getSaleContributions, reviewSaleContribution, type SaleContribution } from "../../services/salesService";

const sourceLabel = (source: SaleContribution["source"]) => source === "csv" ? "CSV" :
  source === "demo_simulation" ? "Simulation" : "Saisie manuelle";
const statusLabel = (status: SaleContribution["status"]) => ({ pending: "À réconcilier", accepted: "Accepté",
  rejected: "Rejeté", superseded: "Remplacé", voided: "Annulé" })[status];
const eventLabel: Record<string, string> = { accepted: "Accepté", conflict_detected: "Conflit détecté", rejected: "Rejeté",
  replaced: "Remplacement", corrected: "Correction", voided: "Annulation", refund_recorded: "Remboursement signalé" };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Réessayez.";

export default function SalesReconciliation({ from, to, refreshToken, onChanged }: {
  from: string; to: string; refreshToken: number; onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<SaleContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows(await getSaleContributions(from, to)); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load, revision, refreshToken]);
  const pending = rows.filter((row) => row.status === "pending");
  const history = rows.filter((row) => row.status !== "pending").slice(0, 20);

  const review = async (row: SaleContribution, decision: "replace" | "keep", reason: string) => {
    setStatus(""); setError("");
    try {
      await reviewSaleContribution(row.id, row.reviewRevision, decision, reason, crypto.randomUUID());
      setStatus(decision === "replace" ? "Apport accepté ; la vente précédente est conservée dans l’historique." : "Vente existante conservée ; apport rejeté et tracé.");
      setRevision((value) => value + 1);
      await onChanged();
      requestAnimationFrame(() => heading.current?.focus());
    } catch (cause) { setError(errorMessage(cause)); }
  };

  return <section className="sales-panel" aria-labelledby="sales-reconciliation-title">
    <h2 id="sales-reconciliation-title" ref={heading} tabIndex={-1}>Réconciliation et provenance</h2>
    <p>Un seul apport est projeté par date et article. Les apports concurrents restent en attente jusqu’à une décision explicite ; ils ne sont jamais additionnés.</p>
    {loading && <p role="status">Chargement des apports…</p>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!loading && pending.length === 0 && <p>Aucun conflit en attente.</p>}
    {pending.map((row) => <PendingContribution key={row.id} row={row} onReview={review} />)}
    <details className="sales-disclosure"><summary>Historique des apports et décisions ({history.length})</summary>
      {history.length === 0 ? <p>Aucun apport sur cette période.</p> : <ul className="sales-contribution-history">
        {history.map((row) => <li key={row.id}>
          <strong>{row.serviceDate ?? row.sourceDate} · {row.saleItemName ?? row.sourceItemName} · {row.quantity ?? row.sourceQuantity}</strong>
          <span>{sourceLabel(row.source)} · {statusLabel(row.status)} · source révision {row.sourceRevision}</span>
          {row.importLine !== null && <span>Ligne CSV {row.importLine} · empreinte {row.sourceFileHash?.slice(0, 12) ?? "indisponible"}</span>}
          {row.reviewReason && <span>Motif : {row.reviewReason}</span>}
          {row.reviewedAt && <span>Revu par {row.reviewedBy ?? "acteur inconnu"} · {new Date(row.reviewedAt).toLocaleString("fr-FR")}</span>}
          {row.events.map((event, index) => <span key={`${row.id}-${index}`}>{eventLabel[event.kind] ?? event.kind} · révision {event.revision} · par {event.actorId} · {new Date(event.createdAt).toLocaleString("fr-FR")} · {event.reason}</span>)}
        </li>)}
      </ul>}
    </details>
  </section>;
}

function PendingContribution({ row, onReview }: {
  row: SaleContribution; onReview: (row: SaleContribution, decision: "replace" | "keep", reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (decision: "replace" | "keep") => {
    if (!reason.trim()) { setError("Indiquez le motif de cette décision."); return; }
    setSaving(true); setError("");
    try { await onReview(row, decision, reason.trim()); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  return <article className="sales-reconciliation-card" aria-labelledby={`contribution-${row.id}`}>
    <h3 id={`contribution-${row.id}`}>Conflit · {row.serviceDate} · {row.saleItemName ?? row.sourceItemName}</h3>
    <p>Apport candidat : {sourceLabel(row.source)}, {row.quantity ?? row.sourceQuantity} unité(s), révision {row.sourceRevision}.
      {row.importLine !== null ? ` Ligne CSV ${row.importLine}.` : ""}</p>
    {row.currentSale ? <p>Vente actuellement acceptée : {row.currentSale.quantity} unité(s), {sourceLabel(row.currentSale.source)}.</p> :
      <p>La vente précédente n’est plus active ; accepter l’apport créera une seule projection.</p>}
    <label>Motif de réconciliation, sans donnée personnelle<textarea required maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <div className="sales-actions">
      <Button type="button" disabled={saving} onClick={() => void submit("replace")}>Remplacer par l’apport</Button>
      <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("keep")}>Garder la vente existante</Button>
    </div>
    {error && <p role="alert">{error}</p>}
  </article>;
}
