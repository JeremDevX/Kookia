import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatParisDate } from "../../shared/parisDate";
import { displayDate } from "./calendar";
import { labels, workflowEntries } from "./documentModel";
import type { Document } from "./documentModel";
import { createDocuments, readySales, readySalesFilename, salesCsv } from "./documents";
import { download, pdfBytes } from "./exports";
import { createArchive } from "./archiveExport";
import { layoutDocument, svgColor } from "./layout";
import { defaultScenarioOptions, generateScenario } from "./scenario";
import type { Checkpoint, Options } from "./model";
import { continuationStart, MAX_CHECKPOINT_BYTES, parseCheckpointFile } from "./continuation";
import { ScenarioSummary } from "./ScenarioSummary";
import { Settings } from "./Settings";

const initial = defaultScenarioOptions(formatParisDate(), 7);
const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function Preview({ doc }: { doc: Document }) {
  const pages = useMemo(() => layoutDocument(doc), [doc]);
  return <section aria-label="Document sélectionné" className="preview">
    <div className="preview-toolbar">
      <div><h3>{doc.title}</h3><time dateTime={doc.date}>{displayDate(doc.date)}</time></div>
      <button className="secondary" onClick={() => download(pdfBytes(doc), `${doc.id}.pdf`, "application/pdf")}>
        <Download size={16} aria-hidden="true" />Télécharger le PDF
      </button>
    </div>
    <details className="preview-help workshop-details">
      <summary><span>Utiliser cette pièce dans Kookia</span></summary>
      <p>{doc.workflow}</p>
    </details>
    <div className="paper-stack">{pages.map((page, pageIndex) => <svg key={pageIndex} className={`paper${doc.style === "receipt" ? " receipt" : ""}`} viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label={`${doc.title}, page ${pageIndex + 1}`}>
      <rect width={page.width} height={page.height} fill="white"/>
      {page.rules.map((rule, i) => <rect key={i} x={rule.x} y={rule.y} width={rule.width} height={rule.height} fill={svgColor(rule.color)}/>)}
      {page.runs.map((run, i) => <text key={i} x={run.x} y={run.y} fontSize={run.size} fontFamily={run.font === "mono" ? "Courier, monospace" : run.font === "serif" ? "Times New Roman, serif" : "Helvetica, Arial, sans-serif"} fontWeight={run.bold ? 700 : 400} fill={run.muted ? svgColor(page.accent) : "#141a17"}>{run.text}</text>)}
    </svg>)}</div>
    <details className="accessible-document workshop-details">
      <summary><span>Lire le document en texte</span></summary>
      <p>{doc.issuer} → {doc.recipient}</p>
      {doc.sections.map((section, i) => <section key={i}>
        <h4>{section.heading}</h4>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={section.heading}>
          <table>
            <thead><tr>{section.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>{section.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>)}
      {doc.notes.map(note => <p key={note}>{note}</p>)}
    </details>
  </section>;
}
export default function ExportWorkshop() {
  const [today, setToday] = useState(formatParisDate);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(formatParisDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [form, setForm] = useState<Options>(initial);
  const [scenario, setScenario] = useState(() => generateScenario(initial));
  const [continuation, setContinuation] = useState<Checkpoint | null>(null);
  const { docs, sales } = useMemo(() => createDocuments(scenario), [scenario]);
  const [selectedId, setSelectedId] = useState(docs[0].id);
  const [kind, setKind] = useState("all");
  const [date, setDate] = useState(initial.start);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [archiveNotice, setArchiveNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = docs.filter(doc => (kind === "all" || doc.kind === kind) && (!date || doc.date === date));
  const selected = filtered.find(doc => doc.id === selectedId) ?? filtered[0];
  const dirty = JSON.stringify(scenario.options) !== JSON.stringify(form) || JSON.stringify(scenario.opening) !== JSON.stringify(continuation);
  const documentDates = [...new Set([...scenario.days.map(day => day.date), ...docs.map(doc => doc.date)])].sort();
  const ready = readySales(sales, today);
  const hasFutureDays = scenario.days.some(day => day.date > today);
  const generate = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    try {
      const next = generateScenario(form, continuation ?? undefined);
      setScenario(next); setForm(next.options); setKind("all"); setDate(next.options.start);
      setNotice("Dossier mis à jour.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Vérifiez les paramètres du dossier."); }
  };
  const prepareContinuation = (checkpoint: Checkpoint) => {
    const start = continuationStart(checkpoint);
    setContinuation(checkpoint); setForm(current => ({ ...current, start, seed: checkpoint.seed })); setError("");
    setNotice(`Reprise préparée pour le ${displayDate(start)}. Générez le dossier suivant.`);
  };
  const loadContinuation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget, file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_CHECKPOINT_BYTES) throw new Error("Choisissez un fichier de reprise de 25 Mo maximum.");
      prepareContinuation(parseCheckpointFile(await file.text()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de lire ce fichier de reprise."); }
    finally { input.value = ""; }
  };
  const archive = async () => {
    setBusy(true); setArchiveError(""); setArchiveNotice("Préparation du ZIP…");
    try {
      const { options, opening } = scenario;
      const zip = await createArchive({ options, opening, today: formatParisDate() });
      download(zip, `dossier-${options.start}-${options.seed}.zip`, "application/zip");
      setArchiveNotice("ZIP prêt.");
    } catch (cause) {
      setArchiveNotice("");
      setArchiveError(cause instanceof Error ? cause.message : "Création du ZIP impossible.");
    } finally { setBusy(false); }
  };
  return <div className="export-workshop">
    <section className="panel dossier" aria-labelledby="dossier-title">
      <div className="dossier-heading">
        <div>
          <h2 id="dossier-title">{scenario.options.name}</h2>
          <p>Du {displayDate(scenario.options.start)} au {displayDate(scenario.days.at(-1)!.date)} · <span className="dossier-number">Dossier n° {scenario.options.seed}</span></p>
        </div>
        <button type="button" disabled={busy} onClick={archive}>
          <Download size={18} aria-hidden="true" />{busy ? "Préparation…" : "Télécharger le ZIP"}
        </button>
      </div>
      <dl className="dossier-metrics">
        <div><dt>Jours</dt><dd>{scenario.days.length}</dd></div>
        <div><dt>Pièces PDF</dt><dd>{docs.length}</dd></div>
        <div><dt>Encaissements TTC simulés</dt><dd>{currency.format(scenario.days.reduce((sum, day) => sum + day.collected, 0) / 100)}</dd></div>
      </dl>
      <div className="dossier-footer">
        <details className="workshop-details export-downloads">
          <summary><span>Autres téléchargements</span></summary>
          <div className="export-actions">
            <button type="button" className="secondary" disabled={!ready.length} onClick={() => download(salesCsv(ready), readySalesFilename(today), "text/csv;charset=utf-8")}>CSV des ventes à ce jour</button>
            <button type="button" className="secondary" onClick={() => download(JSON.stringify(scenario.checkpoint, null, 2), "stock-reprise.json", "application/json")}>Fichier de reprise des stocks</button>
          </div>
          <p className="hint">{ready.length ? "Le CSV des ventes à ce jour est aussi dans le ZIP." : "Aucune vente à importer à ce jour."}
            {hasFutureDays && " Pour une vente future, attendez la date indiquée sur son CSV."}</p>
        </details>
        <a href="#documents-title" className="workshop-link dossier-jump">Voir les pièces</a>
      </div>
      {dirty && <p className="dossier-dirty">Le ZIP utilise le dossier affiché, avant vos modifications.</p>}
      <p role="status" className="status">{archiveNotice}</p>
      {archiveError && <p role="alert" className="error">{archiveError}</p>}
    </section>
    <div className="workspace">
      <section className="settings panel" aria-labelledby="settings-title">
        <h2 id="settings-title" className="section-heading">Réglages du dossier</h2>
        <form onSubmit={generate} onInvalidCapture={event => {
          let disclosure = (event.target as HTMLElement).closest("details");
          while (disclosure) {
            disclosure.open = true;
            disclosure = disclosure.parentElement?.closest("details") ?? null;
          }
        }}>
          <Settings value={form} onChange={setForm}/>
          <details className="continuation workshop-details"><summary><span>Reprendre un dossier</span></summary>
            <label>Fichier de reprise<input type="file" accept=".json,application/json" aria-describedby="continuation-help" onChange={loadContinuation}/></label>
            <p className="hint" id="continuation-help">Fichier stock-reprise.json ou scenario.json (version 2).</p>
            <button type="button" className="secondary" onClick={() => { try { prepareContinuation(scenario.checkpoint); } catch (cause) { setError(cause instanceof Error ? cause.message : "Reprise impossible."); } }}>Continuer après ce dossier</button>
            {continuation && <div className="workshop-structured">
              <p className="period-note">Clôture du {displayDate(continuation.asOf)} · {continuation.lots.length} lots · {continuation.pendingOrders.length} commandes en attente.</p>
              <p className="hint">Début obligatoire le {displayDate(continuationStart(continuation))}.</p>
              <button type="button" className="secondary" onClick={() => { setContinuation(null); setNotice("Reprise retirée. Le prochain dossier partira d’un stock vide."); }}>Retirer la reprise</button>
            </div>}
          </details>
          <button className="generate-button" type="submit">Générer le dossier</button>
          {dirty && <p className="hint draft-note">Modifications à appliquer.</p>}
          <p role="status" className="status">{notice}</p>
          {error && <p role="alert" className="error">{error}</p>}
        </form>
      </section>
      <div className="results">
        <section className="panel documents" aria-labelledby="documents-title">
          <div className="workshop-heading">
            <h2 id="documents-title" tabIndex={-1}>Pièces du dossier</h2>
            <p className="workshop-muted">{filtered.length} {filtered.length === 1 ? "pièce" : "pièces"}</p>
          </div>
          <div className="filters">
            <label>Type de pièce<select value={kind} onChange={e => setKind(e.target.value)}>
              <option value="all">Tous les types</option>
              {Object.entries(labels).filter(([key]) => docs.some(doc => doc.kind === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Date<select value={date} onChange={e => setDate(e.target.value)}>
              <option value="">Toutes les dates</option>
              {documentDates.map(date => <option key={date} value={date}>{displayDate(date)}</option>)}
            </select></label>
            <label>Pièce à afficher<select value={selected?.id ?? ""} disabled={!filtered.length} onChange={e => setSelectedId(e.target.value)}>
              {filtered.length === 0 && <option value="">Aucune pièce</option>}
              {filtered.map(doc => <option key={doc.id} value={doc.id}>{displayDate(doc.date)} · {doc.title} · {doc.kind === "order" ? doc.recipient : doc.issuer}</option>)}
            </select></label>
          </div>
          {selected ? <Preview doc={selected}/> : <p className="empty" role="status">Aucune pièce pour ces filtres. Changez la date ou le type.</p>}
        </section>
        <ScenarioSummary scenario={scenario}/>
        <details className="coverage panel">
          <summary><span>Guide d’import dans Kookia</span></summary>
          <p>Utilisez un espace de test. Commencez par le restaurant, les fournisseurs, les produits et les recettes.</p>
          {scenario.options.start < today && <p>Les ventes gardent la date du service. Les productions et inventaires manuels prennent la date de saisie.</p>}
          <ol>{workflowEntries.map(({ kind, label, text }) => <li key={kind}><strong>{label}</strong><p>{text}</p></li>)}</ol>
        </details>
      </div>
    </div>
  </div>;
}
