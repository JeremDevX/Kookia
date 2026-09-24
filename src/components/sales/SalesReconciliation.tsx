import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getSaleContributions, getSales, reviewSaleContribution, type DailySale, type SaleContribution, type SaleItem } from "../../services/salesService";

const sourceLabel = (source: SaleContribution["source"] | DailySale["source"], posBatch = false,
  ticketBatch?: SaleContribution["ticketBatch"]) => ticketBatch ?
  ticketBatch.provenance === "demo_simulation" ? "Ticket Z simulé" : "Ticket Z transcrit" : posBatch ?
  source === "demo_simulation" ? "Caisse POS simulée" : "Caisse POS" : source === "csv" ? "CSV" :
  source === "pos" ? "Caisse POS" : source === "demo_simulation" ? "Simulation" : source === "ticket_z" ? "Ticket Z transcrit" : "Saisie manuelle";
const statusLabel = (status: SaleContribution["status"]) => ({ pending: "À réconcilier", accepted: "Accepté",
  rejected: "Rejeté", superseded: "Remplacé", voided: "Annulé" })[status];
const eventLabel: Record<string, string> = { source_received: "Ligne reçue", accepted: "Accepté", conflict_detected: "Conflit détecté", rejected: "Rejeté",
  replaced: "Remplacement", corrected: "Correction", voided: "Annulation", refund_recorded: "Remboursement signalé" };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Réessayez.";

export default function SalesReconciliation({ from, to, refreshToken, items, ticketPreview, onChanged }: {
  from: string; to: string; refreshToken: number; items: SaleItem[];
  ticketPreview: { contentHash: string; url: string; mimeType: "application/pdf" | "image/jpeg" | "image/png" } | null;
  onChanged: () => Promise<void>;
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

  const review = async (row: SaleContribution, decision: "replace" | "keep" | "reject", reason: string, saleItemId?: string) => {
    setStatus(""); setError("");
    try {
      await reviewSaleContribution(row.id, row.reviewRevision, decision, reason, crypto.randomUUID(), saleItemId);
      setStatus(decision === "replace" ? "Vente confirmée ; la décision et sa provenance sont enregistrées." :
        decision === "keep" ? "Vente existante conservée ; l’autre apport est tracé." : "Apport écarté et tracé.");
      setRevision((value) => value + 1);
      await onChanged();
      requestAnimationFrame(() => heading.current?.focus());
    } catch (cause) { setError(errorMessage(cause)); }
  };

  return <section className="sales-panel" aria-labelledby="sales-reconciliation-title">
    <h2 id="sales-reconciliation-title" ref={heading} tabIndex={-1}>Réconciliation et provenance</h2>
    <p>Une seule vente est retenue par date et article. Les lignes de caisse restent à vérifier ; remboursements et doublons ne diminuent ni n’additionnent les ventes automatiquement.</p>
    {loading && <p role="status">Chargement des apports…</p>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!loading && pending.length === 0 && <p>Aucun apport en attente de revue.</p>}
    {pending.map((row) => <PendingContribution key={row.id} row={row} items={items} ticketPreview={ticketPreview} onReview={review} />)}
    <details className="sales-disclosure"><summary>Historique des apports et décisions ({history.length})</summary>
      {history.length === 0 ? <p>Aucun apport sur cette période.</p> : <ul className="sales-contribution-history">
        {history.map((row) => <li key={row.id}>
          <strong>{row.serviceDate ?? row.sourceDate} · {row.saleItemName ?? row.sourceItemName} · {row.quantity ?? row.sourceQuantity}</strong>
          <span>{sourceLabel(row.source, Boolean(row.posBatch), row.ticketBatch)} · {statusLabel(row.status)} · source révision {row.sourceRevision}</span>
          {row.posBatch && <span>Lot {row.posBatch.batchId} · période {row.posBatch.from}–{row.posBatch.to} · {row.posBatch.coverage === "complete" ? "données complètes reçues" : "données partielles reçues"} · {row.posBatch.provenance === "demo_simulation" ? "simulation de fixture" : "source enregistrée"}</span>}
          {row.ticketBatch && <span>Ticket Z · service {row.ticketBatch.serviceDate ?? "à vérifier"} · date lue {row.ticketBatch.sourceDateText || "illisible/non renseignée"} · empreinte {row.ticketBatch.contentHash.slice(0, 12)}… · original non conservé</span>}
          {row.ticketLineNumber !== null && <span>Ligne Ticket Z {row.ticketLineNumber}</span>}
          {row.importLine !== null && <span>Ligne CSV {row.importLine} · empreinte {row.sourceFileHash?.slice(0, 12) ?? "indisponible"}</span>}
          {row.reviewReason && <span>Motif : {row.reviewReason}</span>}
          {row.reviewedAt && <span>Revu par {row.reviewedBy ?? "acteur inconnu"} · {new Date(row.reviewedAt).toLocaleString("fr-FR")}</span>}
          {row.events.map((event, index) => <span key={`${row.id}-${index}`}>{eventLabel[event.kind] ?? event.kind} · révision {event.revision} · par {event.actorId} · {new Date(event.createdAt).toLocaleString("fr-FR")} · {event.reason}</span>)}
        </li>)}
      </ul>}
    </details>
  </section>;
}

function PendingContribution({ row, items, ticketPreview, onReview }: {
  row: SaleContribution; items: SaleItem[];
  ticketPreview: { contentHash: string; url: string; mimeType: "application/pdf" | "image/jpeg" | "image/png" } | null;
  onReview: (row: SaleContribution, decision: "replace" | "keep" | "reject", reason: string, saleItemId?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [selectedSaleItemId, setSelectedSaleItemId] = useState(row.saleItemId ?? "");
  const [lookupResult, setLookupResult] = useState<{ itemId: string; state: "loading" } | { itemId: string; state: "loaded"; sale: DailySale | null } | { itemId: string; state: "error"; message: string } | null>(null);
  const lookupNumber = useRef(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lookup = selectedSaleItemId !== row.saleItemId && lookupResult?.itemId === selectedSaleItemId && lookupResult.state === "loading";
  const lookupError = selectedSaleItemId !== row.saleItemId && lookupResult?.itemId === selectedSaleItemId && lookupResult.state === "error" ? lookupResult.message : "";
  const currentSale = selectedSaleItemId === row.saleItemId ? row.currentSale :
    lookupResult?.itemId === selectedSaleItemId && lookupResult.state === "loaded" ? lookupResult.sale : null;
  const ticketOriginalMissing = Boolean(row.ticketBatch && ticketPreview?.contentHash !== row.ticketBatch.contentHash);

  const selectSaleItem = (itemId: string) => {
    setSelectedSaleItemId(itemId);
    setError("");
    if (!itemId || itemId === row.saleItemId || !row.serviceDate) { setLookupResult(null); return; }
    const requestId = ++lookupNumber.current;
    setLookupResult({ itemId, state: "loading" });
    void getSales(row.serviceDate, row.serviceDate).then((sales) => {
      if (requestId === lookupNumber.current) setLookupResult({ itemId, state: "loaded", sale: sales.find((sale) => sale.saleItemId === itemId) ?? null });
    }).catch((cause: unknown) => {
      if (requestId === lookupNumber.current) setLookupResult({ itemId, state: "error", message: errorMessage(cause) });
    });
  };

  const submit = async (decision: "replace" | "keep" | "reject") => {
    if (!reason.trim()) { setError("Indiquez le motif de cette décision."); return; }
    if (ticketOriginalMissing && decision !== "reject") { setError("Réimportez le même Ticket Z pour vérifier l’original avant confirmation."); return; }
    if ((row.posBatch || row.ticketBatch) && !row.sourceRefunded && decision !== "reject" && !selectedSaleItemId) {
      setError("Associez d’abord l’article de la pièce à un article vendu."); return;
    }
    setSaving(true); setError("");
    try { await onReview(row, decision, reason.trim(), (row.posBatch || row.ticketBatch) && !row.sourceRefunded ? selectedSaleItemId || undefined : undefined); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };

  return <article className="sales-reconciliation-card" aria-labelledby={`contribution-${row.id}`}>
    <h3 id={`contribution-${row.id}`}>{row.sourceRefunded ? "Remboursement à vérifier" : currentSale ? "Vente à rapprocher" : "Vente à vérifier"} · {row.serviceDate ?? row.sourceDate} · {row.saleItemName ?? row.sourceItemName}</h3>
    <p>Apport candidat : {sourceLabel(row.source, Boolean(row.posBatch), row.ticketBatch)}, {row.quantity ?? row.sourceQuantity} unité(s), révision {row.sourceRevision}.
      {row.sourceRecordId ? ` Référence caisse ${row.sourceRecordId}.` : ""}
      {row.posBatch ? ` Lot ${row.posBatch.batchId}, données ${row.posBatch.coverage === "complete" ? "complètes" : "partielles"}${row.posBatch.provenance === "demo_simulation" ? " (simulation)" : ""}.` : ""}
      {row.importLine !== null ? ` Ligne CSV ${row.importLine}.` : ""}
      {row.ticketLineNumber !== null ? ` Ligne Ticket Z ${row.ticketLineNumber}.` : ""}</p>
    {row.ticketBatch && <div className="ticket-review-layout">
      {ticketPreview?.contentHash === row.ticketBatch.contentHash ? <figure className="ticket-original-preview">
        <figcaption>Original local · date lue : {row.ticketBatch.sourceDateText || "non lisible"} · service retenu : {row.serviceDate}</figcaption>
        {ticketPreview.mimeType === "application/pdf" ? <iframe title={`Original Ticket Z, ligne ${row.ticketLineNumber ?? ""}`} src={ticketPreview.url} /> :
          <img src={ticketPreview.url} alt={`Original Ticket Z, ligne ${row.ticketLineNumber ?? ""}`} />}
      </figure> : <p role="note">L’original n’est pas conservé. Réimportez le même ticket ci-dessus pour le comparer à cette ligne avant de confirmer ou de garder une vente existante.</p>}
      <div><p>Date de service transcrite : {row.serviceDate}. Date lue sur la pièce : {row.ticketBatch.sourceDateText || "illisible/non renseignée"}.</p>
        {row.ticketBatch.sourceDateText && row.ticketBatch.sourceDateText !== row.serviceDate && <p role="status">Comparez la date lue au service retenu sur la pièce avant décision.</p>}
        <p>La quantité est candidate ; elle ne sera comptée qu’après votre confirmation.</p></div>
    </div>}
    {row.sourceRefunded && <p>Le remboursement est conservé comme information source ; il ne retire pas automatiquement les unités vendues.</p>}
    {(row.posBatch || row.ticketBatch) && !row.sourceRefunded && <label htmlFor={`external-item-${row.id}`}>Article vendu correspondant
      <select id={`external-item-${row.id}`} required value={selectedSaleItemId} disabled={saving} onChange={(event) => selectSaleItem(event.target.value)}>
        <option value="">Choisir un article vendu</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}
    {lookup && <p role="status">Vérification d’une vente déjà enregistrée…</p>}
    {lookupError && <p role="alert">Ventes du jour indisponibles : {lookupError} Aucune décision de remplacement ne peut être prise sans cette vérification.</p>}
    {currentSale ? <p>Vente actuellement enregistrée : {currentSale.quantity} unité(s), {sourceLabel(currentSale.source)}.</p> :
      !row.sourceRefunded && !lookupError && <p>Aucune vente enregistrée pour cet article et ce service ; l’apport restera en attente tant que vous ne le confirmez pas.</p>}
    <label htmlFor={`pos-review-reason-${row.id}`}>Motif de réconciliation, sans donnée personnelle<textarea id={`pos-review-reason-${row.id}`} required maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <div className="sales-actions">
      {!row.sourceRefunded && <Button type="button" disabled={saving || lookup || Boolean(lookupError) || ticketOriginalMissing || Boolean((row.posBatch || row.ticketBatch) && !selectedSaleItemId)}
        onClick={() => void submit("replace")}>{currentSale ? "Remplacer par l’apport" : "Accepter cette vente"}</Button>}
      {currentSale && !row.sourceRefunded ?
        <Button type="button" variant="outline" disabled={saving || lookup || Boolean(lookupError) || ticketOriginalMissing} onClick={() => void submit("keep")}>Garder la vente existante</Button> :
        <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("reject")}>{row.sourceRefunded ? "Écarter le remboursement" : "Écarter l’apport"}</Button>}
    </div>
    {error && <p role="alert">{error}</p>}
  </article>;
}
