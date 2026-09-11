import { useEffect, useState } from "react";
import Button from "../common/Button";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import { getInvoices, saveInvoice, type Invoice, type InvoiceLine } from "../../services/invoiceService";
import { formatLocalISODate } from "../../utils/date";
import "./InvoiceModal.css";

interface InvoiceModalProps { onValidate: () => void; onClose: () => void; }
export default function InvoiceModal({ onValidate, onClose }: InvoiceModalProps) {
  const { products, loading: catalogLoading, error: catalogError } = useInventoryCatalog();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    getInvoices().then((data) => { if (active) { setInvoices(data); setInvoice(data[0] ?? null); } }, (error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Factures indisponibles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const updateLine = (index: number, change: Partial<InvoiceLine>) => setInvoice((current) => current ? { ...current, lines: current.lines.map((line, i) => i === index ? { ...line, ...change } : line) } : current);
  const createDraft = () => {
    setNotice(""); setError("");
    setInvoice({ id: crypto.randomUUID(), reference: "", date: formatLocalISODate(new Date()), lines: [], status: "draft", source: "manual", revision: 0 });
  };
  const persist = async (receive: boolean) => {
    if (!invoice || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await saveInvoice(invoice, receive);
      setInvoice(saved);
      setInvoices((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setNotice(receive ? "Réception enregistrée. Les quantités ont été ajoutées au stock." : "Brouillon enregistré.");
      if (receive) onValidate();
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  const received = invoice?.status === "received";
  const disabled = saving || catalogLoading || !!catalogError;
  return <div className="invoice-modal flex flex-col gap-lg">
    <p>Saisie manuelle : aucun OCR connecté. Vérifiez les produits, quantités et prix avant la réception.</p>
    {(error || catalogError) && <p role="alert">{error || catalogError?.message}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des factures…</p> : <>
      <label htmlFor="invoice-history">Factures enregistrées</label>
      <select className="input-field" id="invoice-history" disabled={saving} value={invoice && invoices.some((item) => item.id === invoice.id) ? invoice.id : ""} onChange={(event) => { setInvoice(invoices.find((item) => item.id === event.target.value) ?? null); setError(""); setNotice(""); }}>
        <option value="" disabled>Nouveau brouillon</option>
        {invoices.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.status === "received" ? "Réceptionnée" : "Brouillon"}</option>)}
      </select>
      <Button variant="outline" onClick={createDraft} disabled={saving}>Nouvelle facture</Button>
      {invoice && <>
        {invoice.source === "demo" && <p>Facture de démonstration datée du 9 décembre 2024. Aucun document n’a été scanné.</p>}
        {received && <p role="status">Déjà réceptionnée le {invoice.receivedAt ? new Date(invoice.receivedAt).toLocaleString("fr-FR") : "—"}. Le stock ne sera pas crédité une seconde fois.</p>}
        <label htmlFor="invoice-reference">Référence</label>
        <input className="input-field" id="invoice-reference" value={invoice.reference} disabled={disabled || received} onChange={(event) => setInvoice({ ...invoice, reference: event.target.value })} />
        <label htmlFor="invoice-date">Date de facture</label>
        <input className="input-field" id="invoice-date" type="date" value={invoice.date} disabled={disabled || received} onChange={(event) => setInvoice({ ...invoice, date: event.target.value })} />
        {invoice.lines.map((line, index) => <fieldset key={index} disabled={disabled || received} className="flex flex-col gap-sm">
          <legend>Ligne {index + 1}</legend>
          <label htmlFor={`invoice-product-${index}`}>Produit</label>
          <select className="input-field" id={`invoice-product-${index}`} value={line.productId} onChange={(event) => updateLine(index, { productId: event.target.value })}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
          </select>
          <label htmlFor={`invoice-quantity-${index}`}>Quantité ({products.find((product) => product.id === line.productId)?.unit})</label>
          <input className="input-field" id={`invoice-quantity-${index}`} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
          <label htmlFor={`invoice-price-${index}`}>Prix unitaire (€)</label>
          <input className="input-field" id={`invoice-price-${index}`} type="number" min="0" step="0.0001" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })} />
          <Button variant="outline" onClick={() => setInvoice({ ...invoice, lines: invoice.lines.filter((_, i) => i !== index) })}>Retirer cette ligne</Button>
        </fieldset>)}
        {!received && <Button variant="outline" disabled={disabled || products.length === 0} onClick={() => setInvoice({ ...invoice, lines: [...invoice.lines, { productId: products[0].id, quantity: 1, unitPrice: products[0].pricePerUnit }] })}>Ajouter une ligne</Button>}
        <strong>Total : {invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0).toFixed(2)} €</strong>
        {!received && <div className="invoice-actions">
          <Button variant="outline" onClick={() => void persist(false)} disabled={disabled}>Enregistrer le brouillon</Button>
          <Button onClick={() => void persist(true)} disabled={disabled}>Valider la réception et le stock</Button>
        </div>}
      </>}
    </>}
    <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
  </div>;
}
