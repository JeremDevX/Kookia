import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { displayDate } from "./calendar";
import { labels, type Document } from "./documentModel";
import { download, pdfBytes } from "./exports";
import { layoutDocument, svgColor, type Page } from "./layout";
import "./workshopDocuments.css";

type DocumentFilters = { kind: Document["kind"] | "all"; date: string };
type DocumentView = "paper" | "text";

function PaperPreview({ doc, page, pageNumber }: { doc: Document; page: Page; pageNumber: number }) {
  return <div className="paper-stack">
    <svg className={doc.style === "receipt" ? "paper receipt" : "paper"} viewBox={`0 0 ${page.width} ${page.height}`}
      role="img" aria-label={`${doc.title}, page ${pageNumber}`}>
      <rect width={page.width} height={page.height} fill="white" />
      {page.rules.map((rule, index) => <rect key={index} x={rule.x} y={rule.y} width={rule.width} height={rule.height} fill={svgColor(rule.color)} />)}
      {page.runs.map((run, index) => <text key={index} x={run.x} y={run.y} fontSize={run.size}
        fontFamily={run.font === "mono" ? "Courier, monospace" : run.font === "serif" ? "Times New Roman, serif" : "Helvetica, Arial, sans-serif"}
        fontWeight={run.bold ? 700 : 400} fill={run.muted ? svgColor(page.accent) : "#141a17"}>{run.text}</text>)}
    </svg>
  </div>;
}

function TextPreview({ doc }: { doc: Document }) {
  return <section className="document-text" aria-label="Texte du document">
    <dl className="workshop-facts">
      <div><dt>Émetteur</dt><dd>{doc.issuer}</dd></div>
      <div><dt>Destinataire</dt><dd>{doc.recipient}</dd></div>
    </dl>
    {doc.sections.map((section, index) => <section key={index}>
      <h4>{section.heading}</h4>
      {section.rows.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={section.heading}>
        <table>
          <thead><tr>{section.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
          <tbody>{section.rows.map((row, index) => <tr key={index}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div> : <p className="hint">Aucune ligne.</p>}
    </section>)}
    {doc.notes.length > 0 && <section>
      <h4>Notes</h4>
      <ul>{doc.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </section>}
  </section>;
}

function DocumentViewer({ doc, view, onView }: { doc: Document; view: DocumentView; onView: (view: DocumentView) => void }) {
  const pages = useMemo(() => layoutDocument(doc), [doc]);
  const [pageIndex, setPageIndex] = useState(0);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const downloadPdf = () => {
    setDownloadFailed(false);
    try {
      download(pdfBytes(doc), `${doc.id}.pdf`, "application/pdf");
    } catch {
      setDownloadFailed(true);
    }
  };
  return <section className="preview document-viewer" aria-labelledby="document-viewer-title">
    <header className="preview-toolbar">
      <div>
        <h3 id="document-viewer-title">{doc.title}</h3>
        <p className="document-byline"><time dateTime={doc.date}>{displayDate(doc.date)}</time> · {doc.kind === "order" ? doc.recipient : doc.issuer}</p>
      </div>
      <button type="button" className="secondary" onClick={downloadPdf}><Download size={16} aria-hidden="true" />Télécharger le PDF</button>
    </header>
    {downloadFailed && <p className="error document-download-error" role="alert">Téléchargement impossible. Réessayez.</p>}
    <div className="document-view-controls">
      <div className="document-views" role="group" aria-label="Mode de lecture">
        <button type="button" className="secondary" aria-pressed={view === "paper"} onClick={() => onView("paper")}>Aperçu PDF</button>
        <button type="button" className="secondary" aria-pressed={view === "text"} onClick={() => onView("text")}>Lire en texte</button>
      </div>
      {view === "paper" && pages.length > 1 && <div className="document-pagination" role="group" aria-label="Pages du document">
        <button type="button" className="secondary document-arrow" aria-label="Page précédente" aria-disabled={pageIndex === 0}
          onClick={() => setPageIndex(index => Math.max(index - 1, 0))}><ChevronLeft size={18} aria-hidden="true" /></button>
        <span role="status">Page {pageIndex + 1} sur {pages.length}</span>
        <button type="button" className="secondary document-arrow" aria-label="Page suivante" aria-disabled={pageIndex === pages.length - 1}
          onClick={() => setPageIndex(index => Math.min(index + 1, pages.length - 1))}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>}
    </div>
    <details className="workshop-details document-help">
      <summary><span>Utiliser cette pièce dans Kookia</span></summary>
      <p>{doc.workflow}</p>
    </details>
    {view === "paper" ? <PaperPreview doc={doc} page={pages[pageIndex]} pageNumber={pageIndex + 1} /> : <TextPreview doc={doc} />}
  </section>;
}

export default function WorkshopDocuments({ docs, documentDates, initialDate }: { docs: Document[]; documentDates: string[]; initialDate: string }) {
  const [filters, setFilters] = useState<DocumentFilters>({ kind: "all", date: initialDate });
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<DocumentView>("paper");
  const heading = useRef<HTMLHeadingElement>(null);
  const kinds = useMemo(() => new Set(docs.map(doc => doc.kind)), [docs]);
  const filtered = useMemo(() => docs.filter(doc => (filters.kind === "all" || doc.kind === filters.kind) && (!filters.date || doc.date === filters.date)), [docs, filters]);
  const selectedIndex = Math.max(filtered.findIndex(doc => doc.id === selectedId), 0);
  const selected = filtered[selectedIndex];
  const browse = (index: number) => {
    if (filtered[index]) setSelectedId(filtered[index].id);
  };
  const activeFilters = filters.kind !== "all" || Boolean(filters.date);
  return <section className="panel document-library" aria-labelledby="documents-title">
    <div className="workshop-heading">
      <h2 id="documents-title" ref={heading} tabIndex={-1}>Pièces du dossier</h2>
      <p className="workshop-muted" role="status">{filtered.length} {filtered.length === 1 ? "pièce" : "pièces"}</p>
    </div>
    <div className="document-filters">
      <label>Date
        <select value={filters.date} onChange={event => setFilters({ ...filters, date: event.currentTarget.value })}>
          <option value="">Toutes les dates</option>
          {documentDates.map(date => <option key={date} value={date}>{displayDate(date)}</option>)}
        </select>
      </label>
      <label>Type de pièce
        <select value={filters.kind} onChange={event => setFilters({ ...filters, kind: event.currentTarget.value as DocumentFilters["kind"] })}>
          <option value="all">Tous les types</option>
          {Array.from(kinds, kind => <option key={kind} value={kind}>{labels[kind]}</option>)}
        </select>
      </label>
    </div>
    {selected ? <>
      <div className="document-picker">
        <label>Pièce à afficher
          <select value={selected.id} onChange={event => setSelectedId(event.currentTarget.value)}>
            {filtered.map(doc => <option key={doc.id} value={doc.id}>
              {filters.date ? "" : `${displayDate(doc.date)} · `}{doc.title} · {doc.kind === "order" ? doc.recipient : doc.issuer}
            </option>)}
          </select>
        </label>
        <div role="group" aria-label="Parcourir les pièces">
          <button type="button" className="secondary document-arrow" aria-label="Pièce précédente" aria-disabled={selectedIndex === 0}
            onClick={() => browse(selectedIndex - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="document-position" role="status">{selectedIndex + 1} sur {filtered.length}</span>
          <button type="button" className="secondary document-arrow" aria-label="Pièce suivante" aria-disabled={selectedIndex >= filtered.length - 1}
            onClick={() => browse(selectedIndex + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <DocumentViewer key={selected.id} doc={selected} view={view} onView={setView} />
    </> : <div className="empty document-empty">
      <p>{activeFilters ? "Aucune pièce pour ces filtres." : "Aucune pièce dans ce dossier."}</p>
      {activeFilters && <button type="button" className="secondary" onClick={() => {
        setFilters({ kind: "all", date: "" });
        setSelectedId("");
        heading.current?.focus();
      }}>Effacer les filtres</button>}
    </div>}
  </section>;
}
