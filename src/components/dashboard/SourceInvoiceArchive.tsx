import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { createInvoiceDraftFromSource, getSourceInvoice, getSourceInvoices, type Invoice,
  extractInvoiceFixture, getInvoiceExtractionMode, type InvoiceExtractionMode, type SourceInvoiceDetail,
  type SourceInvoiceSummary } from "../../services/invoiceService";
import "./InvoiceModal.css";

interface SourceInvoiceArchiveProps {
  refreshKey: number;
  sourceId?: string;
  onCreateManual: () => void;
  onExtractionComplete: () => void;
  onOpenDraft: (invoice: Invoice) => void;
}

const sourceTypeLabel = (type: SourceInvoiceSummary["type"]) => ({
  invoice: "Facture (type transcrit, à confirmer)", credit: "Avoir — aucune entrée stock", delivery: "Bon de livraison — à rapprocher",
}[type]);

export default function SourceInvoiceArchive({ refreshKey, sourceId, onCreateManual, onExtractionComplete, onOpenDraft }: SourceInvoiceArchiveProps) {
  const [retryRevision, setRetryRevision] = useState(0);
  const requestKey = `${refreshKey}:${retryRevision}`;
  const [invoices, setInvoices] = useState<SourceInvoiceSummary[]>([]);
  const [selected, setSelected] = useState<SourceInvoiceDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const loading = loadedRequestKey !== requestKey;
  const [detailLoading, setDetailLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionMode, setExtractionMode] = useState<InvoiceExtractionMode>("manual");
  const [fixturePreviewUrl, setFixturePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [detailError, setDetailError] = useState("");
  const requestId = useRef(0);
  const selectedIdRef = useRef("");
  const archiveRetryButtonRef = useRef<HTMLButtonElement>(null);
  const archiveHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailRetryButtonRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const archiveRetryFocusPending = useRef(false);
  const detailRetryFocusPending = useRef(false);

  useEffect(() => {
    let active = true;
    getInvoiceExtractionMode().then(({ mode }) => { if (active) setExtractionMode(mode); }, () => {
      if (active) setError("Lecture automatique indisponible. La saisie manuelle reste disponible.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (fixturePreviewUrl) URL.revokeObjectURL(fixturePreviewUrl); }, [fixturePreviewUrl]);

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

  const retryArchive = () => {
    archiveRetryFocusPending.current = document.activeElement === archiveRetryButtonRef.current;
    setRetryRevision((value) => value + 1);
  };

  const retryDetail = () => {
    detailRetryFocusPending.current = document.activeElement === detailRetryButtonRef.current;
    void open(selectedId);
  };

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

  const tryFixtureExtraction = async () => {
    if (extracting) return;
    setExtracting(true);
    setError("");
    try {
      const response = await fetch("/fixtures/invoice-extraction-demo.pdf", { cache: "no-store" });
      if (!response.ok) throw new Error("La pièce fictive est indisponible. Vous pouvez saisir la facture manuellement.");
      const file = await response.blob();
      const previewUrl = URL.createObjectURL(file);
      setFixturePreviewUrl(previewUrl);
      const candidate = await extractInvoiceFixture(file);
      onExtractionComplete();
      await open(candidate.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lecture automatique indisponible. Vous pouvez saisir la facture manuellement.");
    } finally { setExtracting(false); }
  };

  const filtered = invoices.filter((invoice) => `${invoice.title} ${invoice.supplier} ${invoice.date ?? ""}`
    .toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const currentArchiveError = loading ? "" : archiveError;
  const linkedStatus = selected?.invoiceStatus === "received" ? "Réception simulée enregistrée"
    : selected?.invoiceStatus === "draft" ? "Brouillon lié à cette pièce"
      : "Aucun brouillon ni réception liée";

  return <section id="invoices" className="source-invoice-archive" aria-labelledby="source-invoice-title">
    <div className="workspace-section-heading"><div>
      <h2 ref={archiveHeadingRef} id="source-invoice-title" tabIndex={-1}>Factures et pièces fournisseurs</h2>
      <p>Les transcriptions sont des sources à confirmer. Les lignes ci-dessous sont des candidates, pas des mouvements de stock.</p>
    </div><div className="source-invoice-heading-actions">
      <span>{loading ? "Chargement…" : currentArchiveError ? "Indisponible" : `${invoices.length} pièce${invoices.length === 1 ? "" : "s"}`}</span>
      {extractionMode === "demo_fixture" && <Button variant="outline" onClick={() => void tryFixtureExtraction()} aria-disabled={extracting}>
        {extracting ? "Lecture de la fixture…" : "Essayer la fixture fictive"}
      </Button>}
      <Button variant="outline" onClick={onCreateManual}>Saisir manuellement</Button>
    </div></div>
    {extracting && <p role="status">Lecture de la pièce fictive en cours…</p>}
    <p>Les dates affichées peuvent être décalées pour le scénario. Toute réception issue de ces pièces reste simulée : aucun achat ni envoi réel n’est créé.
      {extractionMode === "demo_fixture" && " L’essai utilise uniquement une pièce PDF publique et fictive; l’original reste dans le navigateur et n’est pas conservé par l’API."}</p>
    {fixturePreviewUrl && <p><a href={fixturePreviewUrl} target="_blank" rel="noreferrer">Consulter l’original fictif (PDF)</a></p>}
    {error && <p role="alert">{error}</p>}
    {currentArchiveError && <div role="alert"><p>Archive des pièces indisponible : {currentArchiveError}</p>
      <Button ref={archiveRetryButtonRef} type="button" variant="outline" onClick={retryArchive}>Recharger les pièces</Button>
    </div>}
    {detailError && <div role="alert"><p>Lecture de la pièce impossible : {detailError}</p>
      <Button ref={detailRetryButtonRef} type="button" variant="outline" onClick={retryDetail}>Réessayer cette pièce</Button>
    </div>}
    {loading ? <p role="status">Chargement des pièces…</p> : currentArchiveError ? null : invoices.length === 0 ?
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
          <h3 ref={detailHeadingRef} tabIndex={-1}>{selected.title}</h3>
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
          <button type="button" className="btn btn-primary" onClick={() => void resume()} aria-disabled={opening}>
            {opening ? "Ouverture…" : selected.invoiceStatus === "draft" ? "Reprendre le brouillon" : selected.invoiceStatus === "received" ? "Voir la réception" :
              selected.type === "invoice" ? "Créer un brouillon corrigible" : "Consulter et classer la pièce"}
          </button>
        </section>}
      </div>}
  </section>;
}
