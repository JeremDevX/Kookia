import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { ApiError } from "../../config/api";
import { getInvoices, saveInvoice, type Invoice, type InvoiceLine, type SourceLineDisposition } from "../../services/invoiceService";
import type { Product, Supplier } from "../../types";
import { formatLocalISODate } from "../../utils/date";
import "./InvoiceModal.css";

interface InvoiceModalProps {
  initialInvoice?: Invoice;
  products: Product[];
  suppliers: Supplier[];
  catalogLoading: boolean;
  catalogError: Error | null;
  onRetryCatalog: () => Promise<void>;
  onValidate: (invoice: Invoice) => void;
  onInvoiceDataChanged: () => void;
  onClose: () => void;
}

const exclusionLabels: Record<NonNullable<InvoiceLine["exclusionReason"]>, string> = {
  not_stock_item: "Hors stock",
  not_readable: "Ligne illisible ou incertaine",
  not_applicable: "Ne correspond pas à cette réception",
  other: "Autre motif",
};

export default function InvoiceModal({ initialInvoice, products, suppliers, catalogLoading, catalogError,
  onRetryCatalog, onValidate, onInvoiceDataChanged, onClose }: InvoiceModalProps) {
  const [historyRetryRevision, setHistoryRetryRevision] = useState(0);
  const [loadedHistoryRetryRevision, setLoadedHistoryRetryRevision] = useState(-1);
  const loading = loadedHistoryRetryRevision !== historyRetryRevision;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice ?? null);
  const invoiceIdRef = useRef(invoice?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadConflictInvoice, setReloadConflictInvoice] = useState(false);
  const [sourceConflictInvoiceId, setSourceConflictInvoiceId] = useState<string | null>(null);
  const [invoiceLoadError, setInvoiceLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const invoiceHistorySelectRef = useRef<HTMLSelectElement>(null);
  const historyRetryButtonRef = useRef<HTMLButtonElement>(null);
  const catalogRetryButtonRef = useRef<HTMLButtonElement>(null);
  const saveDraftButtonRef = useRef<HTMLButtonElement>(null);
  const receiveButtonRef = useRef<HTMLButtonElement>(null);
  const sourceConflictCloseButtonRef = useRef<HTMLButtonElement>(null);
  const firstProductSelectRef = useRef<HTMLSelectElement>(null);
  const historyRetryFocusPending = useRef(false);
  const persistFocusPending = useRef<"draft" | "receive" | "source-conflict" | null>(null);
  const preferLatestHistoryInvoice = useRef(false);
  const catalogRetryFocusPending = useRef(false);
  const currentInvoiceLoadError = loading ? "" : invoiceLoadError;
  const sourceLinked = invoice?.source === "source_document";
  const sourceConflict = invoice?.id === sourceConflictInvoiceId;
  const persistenceBlocked = !!invoice && !sourceLinked && (loading || !!currentInvoiceLoadError);

  useEffect(() => { invoiceIdRef.current = invoice?.id; }, [invoice]);

  useEffect(() => {
    let active = true;
    getInvoices().then((data) => {
      if (active) {
        setInvoices(data);
        if (preferLatestHistoryInvoice.current) {
          preferLatestHistoryInvoice.current = false;
          const latestInvoice = invoiceIdRef.current ? data.find((item) => item.id === invoiceIdRef.current) : data[0];
          if (latestInvoice) {
            setInvoice(latestInvoice);
            setError("");
            setReloadConflictInvoice(false);
          } else {
            setError("Cette facture n’est plus présente dans l’historique rechargé. Votre brouillon local est conservé.");
            setReloadConflictInvoice(false);
          }
        } else {
          setInvoice((current) => current ?? initialInvoice ?? data[0] ?? null);
        }
        setInvoiceLoadError("");
        setLoadedHistoryRetryRevision(historyRetryRevision);
      }
    }, (cause: unknown) => {
      if (active) {
        setInvoiceLoadError(cause instanceof Error ? cause.message : "Factures indisponibles.");
        setLoadedHistoryRetryRevision(historyRetryRevision);
      }
    });
    return () => { active = false; };
  }, [historyRetryRevision, initialInvoice]);

  useEffect(() => {
    if (loading || !historyRetryFocusPending.current) return;
    historyRetryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (currentInvoiceLoadError) historyRetryButtonRef.current?.focus();
    else invoiceHistorySelectRef.current?.focus();
  }, [currentInvoiceLoadError, invoices, loading]);

  useEffect(() => {
    if (catalogLoading || !catalogRetryFocusPending.current) return;
    catalogRetryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (catalogError) catalogRetryButtonRef.current?.focus();
    else if (firstProductSelectRef.current) firstProductSelectRef.current.focus();
    else invoiceHistorySelectRef.current?.focus();
  }, [catalogError, catalogLoading, invoice]);

  useEffect(() => {
    if (saving || !persistFocusPending.current) return;
    const target = persistFocusPending.current;
    persistFocusPending.current = null;
    if (document.activeElement !== document.body) return;
    if (target === "source-conflict") sourceConflictCloseButtonRef.current?.focus();
    else if (target === "receive") invoiceHistorySelectRef.current?.focus();
    else saveDraftButtonRef.current?.focus();
  }, [error, invoice, saving]);

  const retryHistory = () => {
    historyRetryFocusPending.current = document.activeElement === historyRetryButtonRef.current;
    preferLatestHistoryInvoice.current = reloadConflictInvoice && !!invoice;
    setHistoryRetryRevision((value) => value + 1);
  };

  const retryCatalog = () => {
    catalogRetryFocusPending.current = document.activeElement === catalogRetryButtonRef.current;
    void onRetryCatalog();
  };

  const updateLine = (index: number, change: Partial<InvoiceLine>) => setInvoice((current) => current
    ? { ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...change } : line) }
    : current);
  const createDraft = () => {
    setNotice(""); setError(""); setReloadConflictInvoice(false); setSourceConflictInvoiceId(null);
    setInvoice({ id: crypto.randomUUID(), reference: "", date: formatLocalISODate(new Date()), lines: [],
      status: "draft", source: "manual", revision: 0 });
  };
  const persist = async (receive: boolean) => {
    if (!invoice || saving || sourceConflict || persistenceBlocked || catalogLoading || catalogError) return;
    const actionButton = receive ? receiveButtonRef.current : saveDraftButtonRef.current;
    persistFocusPending.current = document.activeElement === actionButton ? (receive ? "receive" : "draft") : null;
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await saveInvoice(invoice, receive);
      setInvoice(saved);
      setInvoices((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setReloadConflictInvoice(false);
      setSourceConflictInvoiceId((conflictedId) => conflictedId === saved.id ? null : conflictedId);
      setNotice(receive
        ? invoice.source === "source_document"
          ? "Réception de démonstration enregistrée. Aucun achat réel ni envoi fournisseur n’a été créé."
          : "Réception enregistrée. Les quantités ont été ajoutées au stock."
        : "Brouillon enregistré.");
      onInvoiceDataChanged();
      if (receive) onValidate(saved);
    } catch (cause) {
      if (cause instanceof ApiError && cause.details.code === "SOURCE_ALREADY_CREDITED" && invoice.source === "source_document") {
        const markCredited = (candidate: Invoice) => candidate.id === invoice.id
          ? { ...candidate, alreadyCreditedBySimulation: true } : candidate;
        setInvoice((current) => current ? markCredited(current) : current);
        setInvoices((previous) => previous.map(markCredited));
        setReloadConflictInvoice(false);
        setError("");
        onInvoiceDataChanged();
      } else if (cause instanceof ApiError && ["SOURCE_CHANGED", "SOURCE_LINE_CHANGED"].includes(cause.details.code) && invoice.source === "source_document") {
        setSourceConflictInvoiceId(invoice.id);
        setReloadConflictInvoice(false);
        setError(cause.message);
        if (persistFocusPending.current) persistFocusPending.current = "source-conflict";
        onInvoiceDataChanged();
      } else {
        setReloadConflictInvoice(cause instanceof ApiError && ["REVISION_CONFLICT", "ALREADY_RECEIVED", "INVOICE_PARTIALLY_RECONCILED"]
          .includes(cause.details.code));
        setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
      }
    } finally { setSaving(false); }
  };

  const received = invoice?.status === "received";
  const disabled = saving || sourceConflict || catalogLoading || !!catalogError;
  const canReceive = !!invoice && !received && !!invoice.reference.trim() && !!invoice.date && invoice.lines.length > 0 &&
    (sourceLinked
      ? invoice.sourceType === "invoice" && invoice.sourceTypeConfirmed === true && invoice.sourceDateConfirmed === true &&
        !invoice.alreadyCreditedBySimulation && invoice.lines.length === invoice.sourceLineCount &&
        invoice.lines.every((line) => line.disposition === "excluded"
          ? !!line.exclusionReason
          : line.disposition === "stock" && !!line.productId && line.quantity > 0 && !!line.unit &&
            products.some((product) => product.id === line.productId && product.unit === line.unit))
      : invoice.lines.every((line) => !!line.productId && line.quantity > 0));
  const total = invoice?.lines.filter((line) => !sourceLinked || line.disposition === "stock")
    .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) ?? 0;

  return <div className="invoice-modal flex flex-col gap-lg">
    <p>{sourceLinked
      ? received
        ? "Réception de démonstration liée à une pièce transcrite. Les lignes sont en lecture seule et ne créditeront pas le stock une seconde fois."
        : "Brouillon lié à une pièce transcrite : vérifiez le type, la date et chaque ligne. L’enregistrement du brouillon ne modifie pas le stock."
      : "Saisie manuelle sans lecture automatique. Vérifiez les quantités et les produits avant tout ajout au stock."}</p>
    {error && <div role="alert"><p>{error}</p>
      {sourceConflict && <>
        <p>Les changements non enregistrés restent visibles tant que ce formulaire reste ouvert ; fermer la modale les abandonnera. Retournez à l’archive pour consulter la pièce à jour.</p>
        <Button ref={sourceConflictCloseButtonRef} type="button" variant="outline" onClick={onClose}>Fermer et consulter la pièce source</Button>
      </>}
      {reloadConflictInvoice && <>
        <p>Charger la version enregistrée remplacera les modifications non enregistrées du formulaire.</p>
        <Button ref={historyRetryButtonRef} type="button" variant="outline" onClick={retryHistory}>Charger la version enregistrée</Button>
      </>}
    </div>}
    {catalogError && <div role="alert"><p>Catalogue indisponible : {catalogError.message}</p>
      <Button ref={catalogRetryButtonRef} type="button" variant="outline" disabled={catalogLoading} onClick={retryCatalog}>Réessayer le catalogue</Button>
    </div>}
    {currentInvoiceLoadError && <div role="alert"><p>Historique des factures indisponible : {currentInvoiceLoadError}</p>
      <Button ref={historyRetryButtonRef} type="button" variant="outline" onClick={retryHistory}>Recharger les factures</Button>
    </div>}
    {persistenceBlocked && <p role="status">L’historique doit être relu avant d’enregistrer cette facture. Votre brouillon en cours reste conservé.</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des factures…</p> : <>
      <label htmlFor="invoice-history">Factures enregistrées</label>
      <select ref={invoiceHistorySelectRef} className="input-field" id="invoice-history" disabled={saving}
        value={invoice && invoices.some((item) => item.id === invoice.id) ? invoice.id : ""}
        onChange={(event) => {
          setInvoice(invoices.find((item) => item.id === event.target.value) ?? null);
          setError(""); setReloadConflictInvoice(false); setNotice("");
        }}>
        <option value="" disabled>Nouveau brouillon</option>
        {invoices.map((item) => <option key={item.id} value={item.id}>
          {item.reference} · {item.status === "received" ? "Réceptionnée" : "Brouillon"}
        </option>)}
      </select>
      <Button variant="outline" onClick={createDraft} disabled={saving || sourceConflict}>Nouvelle facture manuelle</Button>
      {invoice && <>
        {invoice.source === "demo" && <p>Facture d’exemple du 09/12/2024, sans document scanné.</p>}
        {sourceLinked && <section className="invoice-source-note" aria-label="Provenance de la pièce source">
          <h3>Pièce source liée — scénario de démonstration</h3>
          <p><strong>{invoice.sourceTitle}</strong> · {invoice.sourceSupplier}</p>
          <p>Type transcrit : {invoice.sourceType === "invoice" ? "facture" : invoice.sourceType === "credit" ? "avoir" : "bon de livraison"} — à confirmer.
            Statut source : {invoice.sourceStatus ?? "inconnu"}.</p>
          <p>Date de travail de la pièce : {invoice.sourceDate ?? "inconnue"}.</p>
          <p>Hash et révision source conservés côté serveur. Toute réception restera simulée ; aucun achat réel ni message fournisseur ne sera créé.</p>
          {invoice.sourceType !== "invoice" && <p role="alert">Un avoir ou un bon de livraison est consultable, mais ne peut pas créditer le stock dans ce flux.</p>}
          {invoice.alreadyCreditedBySimulation && <p role="alert">Cette pièce a déjà crédité le stock dans le scénario. Ce brouillon ne peut pas ajouter un second crédit.</p>}
        </section>}
        {received && <p role="status">{sourceLinked ? "Réception de démonstration" : "Réception"} enregistrée le {invoice.receivedAt ? new Date(invoice.receivedAt).toLocaleString("fr-FR") : "—"}.
          Le stock ne sera pas crédité une seconde fois.</p>}
        {!received && <>
          <label htmlFor="invoice-supplier">Fournisseur</label>
          <select className="input-field" id="invoice-supplier" value={invoice.supplierId ?? ""} disabled={disabled}
            onChange={(event) => setInvoice({ ...invoice, supplierId: event.target.value || undefined })}>
            <option value="">Non renseigné</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </>}
        <label htmlFor="invoice-reference">Référence</label>
        <input className="input-field" id="invoice-reference" value={invoice.reference} disabled={disabled || received}
          onChange={(event) => setInvoice({ ...invoice, reference: event.target.value })} />
        <label htmlFor="invoice-date">{sourceLinked ? "Date de la pièce" : "Date de facture"}</label>
        <input className="input-field" id="invoice-date" type="date" value={invoice.date} disabled={disabled || received}
          onChange={(event) => setInvoice({ ...invoice, date: event.target.value,
            ...(sourceLinked ? { sourceDateConfirmed: false } : {}) })} />
        {sourceLinked && !received && invoice.sourceType === "invoice" && <>
          <label className="invoice-confirmation">
            <input type="checkbox" checked={invoice.sourceTypeConfirmed ?? false} disabled={disabled}
              onChange={(event) => setInvoice({ ...invoice, sourceTypeConfirmed: event.target.checked })} />
            J’ai vérifié la transcription : il s’agit bien d’une facture (pas d’un avoir ni d’un bon de livraison).
          </label>
          <label className="invoice-confirmation">
            <input type="checkbox" checked={invoice.sourceDateConfirmed ?? false} disabled={disabled || !invoice.date}
              onChange={(event) => setInvoice({ ...invoice, sourceDateConfirmed: event.target.checked })} />
            Je confirme la date utilisée pour cette opération de démonstration.
          </label>
        </>}
        {invoice.lines.map((line, index) => <fieldset key={line.sourceLineNumber ?? index} disabled={disabled || received || line.disposition === "excluded"}
          className="flex flex-col gap-sm">
          <legend>{sourceLinked ? `Ligne source ${line.sourceLineNumber}` : `Ligne ${index + 1}`}</legend>
          {line.sourceLineNumber !== undefined && <p className="invoice-source-line">
            Transcription : {line.sourceName} · {line.sourceQuantityText} · {line.sourceUnitPrice?.toFixed(2) ?? "—"} € ({line.sourceTaxBasis ?? "base inconnue"}).
            Vérifiez le produit, l’unité et le prix avant inclusion.
          </p>}
          <label htmlFor={`invoice-product-${index}`}>Produit</label>
          <select ref={index === 0 ? firstProductSelectRef : undefined} className="input-field"
            id={`invoice-product-${index}`} value={line.productId}
            onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              const sameUnit = !!product && product.unit === line.sourceUnit;
              updateLine(index, { productId: event.target.value, unit: product?.unit ?? "",
                ...(sourceLinked ? { quantity: sameUnit ? line.sourceQuantity ?? 0 : 0,
                  unitPrice: sameUnit ? line.sourceUnitPrice ?? 0 : 0, disposition: "pending" as const } : {}) });
            }}>
            <option value="">Choisir un produit</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
          </select>
          <label htmlFor={`invoice-quantity-${index}`}>Quantité à ajouter ({products.find((product) => product.id === line.productId)?.unit || line.unit || "unité du produit"})</label>
          <input className="input-field" id={`invoice-quantity-${index}`} type="number" min="0" step="0.001"
            value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value), disposition: sourceLinked ? "pending" : line.disposition })} />
          <label htmlFor={`invoice-price-${index}`}>Prix unitaire indicatif (€)</label>
          <input className="input-field" id={`invoice-price-${index}`} type="number" min="0" step="0.0001"
            value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value), disposition: sourceLinked ? "pending" : line.disposition })} />
          {!sourceLinked && <Button variant="outline" onClick={() => setInvoice({ ...invoice, lines: invoice.lines.filter((_, lineIndex) => lineIndex !== index) })}>
            Retirer cette ligne
          </Button>}
        </fieldset>)}
        {sourceLinked && !received && invoice.lines.map((line, index) => line.sourceLineNumber === undefined ? null : <div className="invoice-line-decision" key={`decision-${line.sourceLineNumber}`}>
          <label htmlFor={`invoice-disposition-${index}`}>Décision pour la ligne {line.sourceLineNumber}</label>
          <select className="input-field" id={`invoice-disposition-${index}`} value={line.disposition ?? "pending"}
            disabled={disabled} onChange={(event) => updateLine(index, {
              disposition: event.target.value as SourceLineDisposition,
              ...(event.target.value === "excluded" ? {} : { exclusionReason: undefined }),
            })}>
            <option value="pending">À examiner</option>
            <option value="stock">Inclure au stock</option>
            <option value="excluded">Écarter — sans crédit stock</option>
          </select>
          {line.disposition === "excluded" && <>
            <label htmlFor={`invoice-exclusion-${index}`}>Motif d’exclusion</label>
            <select className="input-field" id={`invoice-exclusion-${index}`} value={line.exclusionReason ?? ""}
              disabled={disabled} onChange={(event) => updateLine(index, { exclusionReason: event.target.value as InvoiceLine["exclusionReason"] })}>
              <option value="">Choisir un motif</option>
              {Object.entries(exclusionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </>}
        </div>)}
        {!sourceLinked && !received && <Button variant="outline" disabled={disabled || products.length === 0}
          onClick={() => setInvoice({ ...invoice, lines: [...invoice.lines, { productId: products[0].id, quantity: 1,
            unitPrice: products[0].pricePerUnit, unit: products[0].unit }] })}>Ajouter une ligne</Button>}
        {sourceLinked
          ? <p>Total indicatif des lignes incluses : {total.toFixed(2)} €. Les bases HT/TTC de la transcription peuvent différer ; ce n’est pas un montant comptable.</p>
          : <strong>Total : {total.toFixed(2)} €</strong>}
        {!received && <div className="invoice-actions">
          <Button ref={saveDraftButtonRef} variant="outline" onClick={() => void persist(false)}
            disabled={disabled || persistenceBlocked || !invoice.reference.trim()}>Enregistrer le brouillon</Button>
          <Button ref={receiveButtonRef} onClick={() => void persist(true)} disabled={disabled || persistenceBlocked || !canReceive}>
            {sourceLinked ? "Réceptionner dans le scénario" : "Réceptionner et ajouter au stock"}
          </Button>
        </div>}
      </>}
    </>}
    <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
  </div>;
}
