import { useEffect, useRef, useState } from "react";
import { getSourceInvoice, getSourceInvoices, type SourceInvoiceDetail, type SourceInvoiceSummary } from "../../services/invoiceService";

export default function SourceInvoiceArchive() {
  const [invoices, setInvoices] = useState<SourceInvoiceSummary[]>([]);
  const [selected, setSelected] = useState<SourceInvoiceDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    getSourceInvoices().then((result) => { if (active) setInvoices(result); }, (cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Pièces indisponibles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const open = async (id: string) => {
    const currentRequest = ++requestId.current;
    setSelectedId(id);
    setSelected(null); setError("");
    if (!id) { setDetailLoading(false); return; }
    setDetailLoading(true);
    try { const detail = await getSourceInvoice(id); if (currentRequest === requestId.current) setSelected(detail); }
    catch (cause) { if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : "Lecture impossible."); }
    finally { if (currentRequest === requestId.current) setDetailLoading(false); }
  };
  const filtered = invoices.filter((invoice) => `${invoice.title} ${invoice.supplier} ${invoice.date ?? ""}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));

  return <details className="source-invoice-archive">
    <summary>Pièces fournisseurs importées ({invoices.length})</summary>
    <p>Dates décalées pour la démonstration. Les lectures OCR et les réceptions restent à vérifier sur les originaux. Les mouvements de stock importés et les sorties simulées ne sont pas des faits opérationnels validés.</p>
    {loading ? <p role="status">Chargement des pièces…</p> : invoices.length === 0 ? <p>Aucune pièce fournisseur importée dans cet espace.</p> : <>
      <label htmlFor="source-invoice-search">Rechercher une pièce</label>
      <input className="input-field" id="source-invoice-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); void open(""); }} />
      <label htmlFor="source-invoice-select">Pièce ({filtered.length} résultat{filtered.length > 1 ? "s" : ""})</label>
      <select className="input-field" id="source-invoice-select" value={selectedId} onChange={(event) => void open(event.target.value)}>
        <option value="">Choisir une pièce</option>
        {filtered.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.date ?? "Sans date"} · {invoice.title}</option>)}
      </select>
      {detailLoading && <p role="status">Lecture de la pièce…</p>}
      {selected && <section aria-label="Détail de la pièce">
        <p><strong>{selected.supplier}</strong> · {selected.stockLines.length} ligne{selected.stockLines.length > 1 ? "s" : ""} chiffrée{selected.stockLines.length > 1 ? "s" : ""} importée{selected.stockLines.length > 1 ? "s" : ""} en stock de démonstration.</p>
        <p>{selected.status}</p>
        <pre className="source-invoice-content">{selected.content}</pre>
      </section>}
    </>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
