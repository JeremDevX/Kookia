import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { createInvoiceDraftFromSource, getSourceInvoice, getSourceInvoices, type Invoice,
  type SourceInvoiceDetail, type SourceInvoiceSummary } from "../../services/invoiceService";
import "./InvoiceModal.css";

interface SourceInvoiceArchiveProps {
  refreshKey: number;
  sourceId?: string;
  onCreateManual: () => void;
  onOpenDraft: (invoice: Invoice) => void;
}

const sourceTypeLabel = (type: SourceInvoiceSummary["type"]) => ({
  invoice: "Facture (type transcrit, à confirmer)", credit: "Avoir — aucune entrée stock", delivery: "Bon de livraison — à rapprocher",
}[type]);

export default function SourceInvoiceArchive({ refreshKey, sourceId, onCreateManual, onOpenDraft }: SourceInvoiceArchiveProps) {
  const [invoices, setInvoices] = useState<SourceInvoiceSummary[]>([]);
  const [selected, setSelected] = useState<SourceInvoiceDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const selectedIdRef = useRef("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSourceInvoices().then((result) => { if (active) setInvoices(result); }, (cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Pièces indisponibles.");
    }).finally(() => { if (active) setLoading(false); });
    if (selectedIdRef.current) {
      getSourceInvoice(selectedIdRef.current).then((detail) => { if (active) setSelected(detail); }, (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Lecture impossible.");
      });
    }
    return () => { active = false; };
  }, [refreshKey]);

  const open = useCallback(async (id: string) => {
    const currentRequest = ++requestId.current;
    selectedIdRef.current = id;
    setSelectedId(id);
    setSelected(null);
    setError("");
    if (!id) { setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const detail = await getSourceInvoice(id);
      if (currentRequest === requestId.current) setSelected(detail);
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : "Lecture impossible.");
    } finally {
      if (currentRequest === requestId.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sourceId) void open(sourceId);
  }, [open, sourceId]);

  const resume = async () => {
    if (!selected || opening) return;
    setOpening(true);
    setError("");
    try { onOpenDraft(await createInvoiceDraftFromSource(selected.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Brouillon indisponible."); }
    finally { setOpening(false); }
  };

  const filtered = invoices.filter((invoice) => `${invoice.title} ${invoice.supplier} ${invoice.date ?? ""}`
    .toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const linkedStatus = selected?.invoiceStatus === "received" ? "Réception simulée enregistrée"
    : selected?.invoiceStatus === "draft" ? "Brouillon lié à cette pièce"
      : "Aucun brouillon ni réception liée";

  return <section id="invoices" className="source-invoice-archive" aria-labelledby="source-invoice-title">
    <div className="workspace-section-heading"><div>
      <h2 id="source-invoice-title">Factures et pièces fournisseurs</h2>
      <p>Les transcriptions sont des sources à confirmer. Les lignes ci-dessous sont des candidates, pas des mouvements de stock.</p>
    </div><div className="source-invoice-heading-actions">
      <span>{loading ? "Chargement…" : `${invoices.length} pièce${invoices.length === 1 ? "" : "s"}`}</span>
      <Button variant="outline" onClick={onCreateManual}>Saisir manuellement</Button>
    </div></div>
    <p>Les dates affichées peuvent être décalées pour le scénario. Toute réception issue de ces pièces reste simulée : aucun achat ni envoi réel n’est créé.</p>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Chargement des pièces…</p> : invoices.length === 0 ?
      <p>Aucune pièce importée dans cet espace. Vous pouvez saisir une facture manuellement.</p> : <div className="source-invoice-controls">
        <label htmlFor="source-invoice-search">Rechercher une pièce</label>
        <input className="input-field" id="source-invoice-search" type="search" value={query}
          onChange={(event) => { setQuery(event.target.value); void open(""); }} />
        <label htmlFor="source-invoice-select">Pièce ({filtered.length} résultat{filtered.length === 1 ? "" : "s"})</label>
        <select className="input-field" id="source-invoice-select" value={selectedId}
          onChange={(event) => void open(event.target.value)}>
          <option value="">Choisir une pièce</option>
          {filtered.map((invoice) => <option key={invoice.id} value={invoice.id}>
            {invoice.date ? `${invoice.date} · ` : "Date de démonstration inconnue · "}{invoice.title}
          </option>)}
        </select>
        {detailLoading && <p role="status">Lecture de la pièce…</p>}
        {selected && <section className="source-invoice-detail" aria-label="Détail de la pièce fournisseur">
          <h3>{selected.title}</h3>
          <p><strong>Fournisseur transcrit :</strong> {selected.supplier}</p>
          <p><strong>Type :</strong> {sourceTypeLabel(selected.type)}. <strong>Statut source :</strong> {selected.status}</p>
          <p><strong>Date d’origine :</strong> {selected.originalDate ?? "inconnue ou non structurée"}.
            <strong> Date de démonstration :</strong> {selected.date ?? "inconnue"}.</p>
          <p>{selected.stockLines.length} ligne{selected.stockLines.length === 1 ? "" : "s"} transcrite{selected.stockLines.length === 1 ? "" : "s"}, à rapprocher.
            {selected.sourceMovementCount > 0 ? ` ${selected.sourceMovementCount} mouvement(s) de cette pièce existe(nt) déjà.` : " Aucun mouvement de cette pièce n’est lié."}</p>
          {selected.alreadyCreditedBySimulation && <p role="alert">Cette pièce a déjà crédité le stock dans la simulation. Aucun nouveau crédit ne sera accepté.</p>}
          <p role="status">{linkedStatus}</p>
          {selected.stockLines.length > 0 && <ul className="source-line-list">
            {selected.stockLines.map((line) => <li key={line.sourceLineNumber}>
              Ligne {line.sourceLineNumber} · {line.name} — {line.sourceQuantityText} · {line.unitPrice.toFixed(2)} € ({line.priceTaxBasis})
            </li>)}
          </ul>}
          <details><summary>Lire la transcription source</summary><pre className="source-invoice-content">{selected.content}</pre></details>
          <button type="button" className="btn btn-primary" onClick={() => void resume()} disabled={opening}>
            {opening ? "Ouverture…" : selected.invoiceStatus === "draft" ? "Reprendre le brouillon" : selected.invoiceStatus === "received" ? "Voir la réception" :
              selected.type === "invoice" ? "Créer un brouillon corrigible" : "Consulter et classer la pièce"}
          </button>
        </section>}
      </div>}
  </section>;
}
