import { useEffect, useState } from "react";
import Button from "../common/Button";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import { getInvoices, saveInvoice, type Invoice, type InvoiceLine, type SourceLineDisposition } from "../../services/invoiceService";
import { formatLocalISODate } from "../../utils/date";
import "./InvoiceModal.css";

interface InvoiceModalProps {
  initialInvoice?: Invoice;
  onValidate: (invoice: Invoice) => void;
  onPersist: () => void;
  onClose: () => void;
}

const exclusionLabels: Record<NonNullable<InvoiceLine["exclusionReason"]>, string> = {
  not_stock_item: "Hors stock",
  not_readable: "Ligne illisible ou incertaine",
  not_applicable: "Ne correspond pas à cette réception",
  other: "Autre motif",
};

export default function InvoiceModal({ initialInvoice, onValidate, onPersist, onClose }: InvoiceModalProps) {
  const { products, suppliers, loading: catalogLoading, error: catalogError } = useInventoryCatalog();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getInvoices().then((data) => {
      if (active) {
        setInvoices(data);
        setInvoice(initialInvoice ?? data[0] ?? null);
      }
    }, (cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Factures indisponibles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialInvoice]);

  const updateLine = (index: number, change: Partial<InvoiceLine>) => setInvoice((current) => current
    ? { ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...change } : line) }
    : current);
  const createDraft = () => {
    setNotice(""); setError("");
    setInvoice({ id: crypto.randomUUID(), reference: "", date: formatLocalISODate(new Date()), lines: [],
      status: "draft", source: "manual", revision: 0 });
  };
  const persist = async (receive: boolean) => {
    if (!invoice || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await saveInvoice(invoice, receive);
      setInvoice(saved);
      setInvoices((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setNotice(receive
        ? invoice.source === "source_document"
          ? "Réception de démonstration enregistrée. Aucun achat réel ni envoi fournisseur n’a été créé."
          : "Réception enregistrée. Les quantités ont été ajoutées au stock."
        : "Brouillon enregistré.");
      onPersist();
      if (receive) onValidate(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally { setSaving(false); }
  };

  const received = invoice?.status === "received";
  const sourceLinked = invoice?.source === "source_document";
  const disabled = saving || catalogLoading || !!catalogError;
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
    <p>Saisie manuelle sans lecture automatique. Vérifiez les quantités et les produits avant tout ajout au stock.</p>
    {(error || catalogError) && <p role="alert">{error || catalogError?.message}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des factures…</p> : <>
      <label htmlFor="invoice-history">Factures enregistrées</label>
      <select className="input-field" id="invoice-history" disabled={saving}
        value={invoice && invoices.some((item) => item.id === invoice.id) ? invoice.id : ""}
        onChange={(event) => {
          setInvoice(invoices.find((item) => item.id === event.target.value) ?? null);
          setError(""); setNotice("");
        }}>
        <option value="" disabled>Nouveau brouillon</option>
        {invoices.map((item) => <option key={item.id} value={item.id}>
          {item.reference} · {item.status === "received" ? "Réceptionnée" : "Brouillon"}
        </option>)}
      </select>
      <Button variant="outline" onClick={createDraft} disabled={saving}>Nouvelle facture manuelle</Button>
      {invoice && <>
        {invoice.source === "demo" && <p>Facture d’exemple du 09/12/2024, sans document scanné.</p>}
        {sourceLinked && <section className="invoice-source-note" aria-label="Provenance de la pièce source">
          <h3>Pièce source liée — scénario de démonstration</h3>
          <p><strong>{invoice.sourceTitle}</strong> · {invoice.sourceSupplier}</p>
          <p>Type transcrit : {invoice.sourceType === "invoice" ? "facture" : invoice.sourceType === "credit" ? "avoir" : "bon de livraison"} — à confirmer.
            Statut source : {invoice.sourceStatus ?? "inconnu"}.</p>
          <p>Date d’origine : {invoice.sourceOriginalDate ?? "inconnue ou non structurée"}.
            Date décalée de démonstration : {invoice.sourceDemoDate ?? "inconnue"}.</p>
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
        <label htmlFor="invoice-date">{sourceLinked ? "Date d’opération (date de démonstration)" : "Date de facture"}</label>
        <input className="input-field" id="invoice-date" type="date" value={invoice.date} disabled={disabled || received}
          onChange={(event) => setInvoice({ ...invoice, date: event.target.value,
            ...(sourceLinked ? { sourceDateConfirmed: false } : {}) })} />
        {sourceLinked && !received && <>
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
          <select className="input-field" id={`invoice-product-${index}`} value={line.productId}
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
          <label htmlFor={`invoice-quantity-${index}`}>Quantité à ajouter ({products.find((product) => product.id === line.productId)?.unit ?? line.unit ?? "unité"})</label>
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
          <Button variant="outline" onClick={() => void persist(false)} disabled={disabled || !invoice.reference.trim()}>Enregistrer le brouillon</Button>
          <Button onClick={() => void persist(true)} disabled={disabled || !canReceive}>
            {sourceLinked ? "Réceptionner dans le scénario" : "Réceptionner et ajouter au stock"}
          </Button>
        </div>}
      </>}
    </>}
    <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
  </div>;
}
