import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { ApiError } from "../../config/api";
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
  const [retryRevision, setRetryRevision] = useState(0);
  const requestKey = `${refreshKey}:${retryRevision}`;
  const [invoices, setInvoices] = useState<SourceInvoiceSummary[]>([]);
  const [selected, setSelected] = useState<SourceInvoiceDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const initialLoading = loading && loadedRequestKey === "";
  const [detailLoading, setDetailLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [sourceConflictId, setSourceConflictId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [detailError, setDetailError] = useState("");
  const requestId = useRef(0);
  const selectedIdRef = useRef("");
  const archiveRetryButtonRef = useRef<HTMLButtonElement>(null);
  const archiveHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailRetryButtonRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const resumeButtonRef = useRef<HTMLButtonElement>(null);
  const archiveRetryFocusPending = useRef(false);
  const detailRetryFocusPending = useRef(false);
  const sourceFocusPending = useRef(false);
  const sourceFocusBeforeNavigation = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    getSourceInvoices().then((result) => {
      if (active) { setInvoices(result); setArchiveError(""); setLoadedRequestKey(requestKey); }
    }, (cause: unknown) => {
      if (active) { setArchiveError(cause instanceof Error ? cause.message : "Pièces indisponibles."); setLoadedRequestKey(requestKey); }
    });
    if (selectedIdRef.current) {
      const detailRequest = ++requestId.current;
      const currentSelectedId = selectedIdRef.current;
      getSourceInvoice(currentSelectedId).then((detail) => {
        if (active && detailRequest === requestId.current && currentSelectedId === selectedIdRef.current) {
          setSelected(detail); setDetailError("");
        }
      }, (cause: unknown) => {
        if (active && detailRequest === requestId.current && currentSelectedId === selectedIdRef.current) {
          setDetailError(cause instanceof Error ? cause.message : "Lecture impossible.");
        }
      });
    }
    return () => { active = false; };
  }, [requestKey]);

  const open = useCallback(async (id: string) => {
    const currentRequest = ++requestId.current;
    selectedIdRef.current = id;
    setSelectedId(id);
    setSelected(null);
    setError("");
    setDetailError("");
    if (!id) { setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const detail = await getSourceInvoice(id);
      if (currentRequest === requestId.current) setSelected(detail);
    } catch (cause) {
      if (currentRequest === requestId.current) setDetailError(cause instanceof Error ? cause.message : "Lecture impossible.");
    } finally {
      if (currentRequest === requestId.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !archiveRetryFocusPending.current) return;
    archiveRetryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (archiveError) archiveRetryButtonRef.current?.focus();
    else archiveHeadingRef.current?.focus();
  }, [archiveError, invoices, loading]);

  useEffect(() => {
    if (detailLoading || !detailRetryFocusPending.current) return;
    detailRetryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (detailError) detailRetryButtonRef.current?.focus();
    else detailHeadingRef.current?.focus();
  }, [detailError, detailLoading, selected]);

  useLayoutEffect(() => {
    if (detailLoading || !sourceFocusPending.current || !selected) return;
    const heading = detailHeadingRef.current;
    if (!heading) return;
    sourceFocusPending.current = false;
    const currentFocus = document.activeElement;
    const previousFocus = sourceFocusBeforeNavigation.current;
    sourceFocusBeforeNavigation.current = null;
    const shouldFocus = currentFocus === null || currentFocus === document.body || currentFocus === previousFocus || !currentFocus.isConnected;
    if (shouldFocus) {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: "center" });
    }
  }, [detailLoading, invoices, loading, selected]);

  const retryArchive = () => {
    archiveRetryFocusPending.current = document.activeElement === archiveRetryButtonRef.current;
    setRetryRevision((value) => value + 1);
  };

  const retryDetail = () => {
    detailRetryFocusPending.current = document.activeElement === detailRetryButtonRef.current;
    void open(selectedId);
  };

  useEffect(() => {
    if (!sourceId) return;
    sourceFocusPending.current = true;
    sourceFocusBeforeNavigation.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void open(sourceId);
  }, [open, sourceId]);

  const resume = async () => {
    if (!selected || opening || sourceConflict) return;
    setOpening(true);
    setError("");
    try { onOpenDraft(await createInvoiceDraftFromSource(selected.id)); }
    catch (cause) {
      if (cause instanceof ApiError && cause.details.code === "SOURCE_CHANGED") {
        setSourceConflictId(selected.id);
        detailRetryFocusPending.current = document.activeElement === resumeButtonRef.current;
        void open(selected.id);
      } else setError(cause instanceof Error ? cause.message : "Brouillon indisponible.");
    }
    finally { setOpening(false); }
  };

  const filtered = invoices.filter((invoice) => `${invoice.title} ${invoice.supplier} ${invoice.date ?? ""}`
    .toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const currentArchiveError = loading ? "" : archiveError;
  const sourceConflict = !!selectedId && selectedId === sourceConflictId;
  const linkedStatus = selected?.invoiceStatus === "received" ? "Réception rapprochée"
    : selected?.invoiceStatus === "draft" ? "Brouillon lié à cette pièce"
      : "Aucun brouillon ni réception liée";

  return <section id="invoices" className="source-invoice-archive" aria-labelledby="source-invoice-title">
    <div className="workspace-section-heading"><div>
      <h2 ref={archiveHeadingRef} id="source-invoice-title" tabIndex={-1}>Factures et pièces fournisseurs</h2>
      <p>Une transcription est une source à confirmer, pas une preuve de livraison. Les lignes n’entrent dans le stock qu’après rapprochement.</p>
    </div><div className="source-invoice-heading-actions">
      <span role="status" aria-busy={loading}>{loading ? "Chargement…" : currentArchiveError ? "Indisponible" : `${invoices.length} pièce${invoices.length === 1 ? "" : "s"}`}</span>
      <Button variant="outline" onClick={onCreateManual}>Saisir manuellement</Button>
    </div></div>
    <p>Les dates de travail peuvent différer des dates de source. Vérifiez la facture originale avant de confirmer une réception ; aucun fournisseur n’est contacté depuis cette page.</p>
    {error && <p role="alert">{error}</p>}
    {sourceConflict && <div className="source-invoice-conflict" role="alert">
      <p><strong>La pièce source a changé depuis la création du brouillon.</strong></p>
      <p>Le brouillon sauvegardé reste intact et aucune réception n’a été créée. La pièce actuelle est rechargée ci-dessous ; ce brouillon ne peut pas être repris tant que la différence n’a pas été traitée.</p>
    </div>}
    {currentArchiveError && <div role="alert"><p>Archive des pièces indisponible : {currentArchiveError}</p>
      <Button ref={archiveRetryButtonRef} type="button" variant="outline" onClick={retryArchive}>Recharger les pièces</Button>
    </div>}
    {detailError && <div role="alert"><p>Lecture de la pièce impossible : {detailError}</p>
      <Button ref={detailRetryButtonRef} type="button" variant="outline" onClick={retryDetail}>Réessayer cette pièce</Button>
    </div>}
    {initialLoading ? <p role="status">Chargement des pièces…</p> : currentArchiveError ? null : invoices.length === 0 ?
      loading ? <p role="status">Actualisation des pièces…</p> :
        <p>Aucune pièce importée dans cet espace. Vous pouvez saisir une facture manuellement.</p> : <div className="source-invoice-controls">
        <label htmlFor="source-invoice-search">Rechercher une pièce</label>
        <input className="input-field" id="source-invoice-search" type="search" value={query}
          onChange={(event) => { setQuery(event.target.value); void open(""); }} />
        <label htmlFor="source-invoice-select">Pièce ({filtered.length} résultat{filtered.length === 1 ? "" : "s"})</label>
        <select className="input-field" id="source-invoice-select" value={selectedId}
          onChange={(event) => void open(event.target.value)}>
          <option value="">Choisir une pièce</option>
          {filtered.map((invoice) => <option key={invoice.id} value={invoice.id}>
            {invoice.date ? `${invoice.date} · ` : "Date inconnue · "}{invoice.title}
          </option>)}
        </select>
        {detailLoading && <p role="status">Lecture de la pièce…</p>}
        {selected && <section className="source-invoice-detail" aria-label="Détail de la pièce fournisseur">
          <h3 ref={detailHeadingRef} tabIndex={-1}>{selected.title}</h3>
          <p><strong>Fournisseur transcrit :</strong> {selected.supplier}</p>
          <p><strong>Type :</strong> {sourceTypeLabel(selected.type)}. <strong>Statut source :</strong> {selected.status}</p>
          <p><strong>Date de travail :</strong> {selected.date ?? "inconnue"}.</p>
          <p>{selected.stockLines.length} ligne{selected.stockLines.length === 1 ? "" : "s"} transcrite{selected.stockLines.length === 1 ? "" : "s"}, à rapprocher.
            {selected.sourceMovementCount > 0 ? ` ${selected.sourceMovementCount} mouvement(s) de cette pièce existe(nt) déjà.` : " Aucun mouvement de cette pièce n’est lié."}</p>
          {selected.alreadyCreditedBySimulation && <p role="status">Cette pièce a déjà été rapprochée dans cet espace. Aucun nouveau crédit ne sera accepté.</p>}
          <p role="status">{linkedStatus}</p>
          {selected.stockLines.length > 0 && <ul className="source-line-list">
            {selected.stockLines.map((line) => <li key={line.sourceLineNumber}>
              Ligne {line.sourceLineNumber} · {line.name} — {line.sourceQuantityText} · {line.unitPrice.toFixed(2)} € ({line.priceTaxBasis})
            </li>)}
          </ul>}
          <details><summary>Lire la transcription (date de travail)</summary><pre className="source-invoice-content">{selected.content}</pre></details>
          <button ref={resumeButtonRef} type="button" className="btn btn-primary" onClick={() => void resume()}
            disabled={sourceConflict} aria-disabled={opening || sourceConflict} aria-busy={opening}>
            {opening ? "Ouverture…" : sourceConflict ? "Brouillon périmé" : selected.invoiceStatus === "draft" ? "Reprendre le brouillon" : selected.invoiceStatus === "received" ? "Voir la réception" :
              selected.type === "invoice" ? "Créer un brouillon corrigible" : "Consulter et classer la pièce"}
          </button>
        </section>}
      </div>}
  </section>;
}
