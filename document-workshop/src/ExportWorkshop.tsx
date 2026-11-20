import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText, Info, SlidersHorizontal } from "lucide-react";
import { formatParisDate } from "../../shared/parisDate";
import { displayDate } from "./calendar";
import { money } from "./catalog";
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
function Preview({ doc }: { doc: Document }) {
  const pages = useMemo(() => layoutDocument(doc), [doc]);
  return <section aria-label="Document sélectionné" className="preview">
    <div className="preview-toolbar">
      <div><h3>{doc.title}</h3><time dateTime={doc.date}>{displayDate(doc.date)}</time></div>
      <button className="secondary" onClick={() => download(pdfBytes(doc), `${doc.id}.pdf`, "application/pdf")}>
        <Download size={16} aria-hidden="true" />Télécharger le PDF
      </button>
    </div>
    <div className="workflow">
      <Info size={18} aria-hidden="true" />
      <div><strong>Utilisation dans Kookia</strong><p>{doc.workflow}</p></div>
    </div>
    <div className="paper-stack">{pages.map((page, pageIndex) => <svg key={pageIndex} className={`paper${doc.style === "receipt" ? " receipt" : ""}`} viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label={`${doc.title}, page ${pageIndex + 1}`}>
      <rect width={page.width} height={page.height} fill="white"/>
      {page.rules.map((rule, i) => <rect key={i} x={rule.x} y={rule.y} width={rule.width} height={rule.height} fill={svgColor(rule.color)}/>)}
      {page.runs.map((run, i) => <text key={i} x={run.x} y={run.y} fontSize={run.size} fontFamily={run.font === "mono" ? "Courier, monospace" : run.font === "serif" ? "Times New Roman, serif" : "Helvetica, Arial, sans-serif"} fontWeight={run.bold ? 700 : 400} fill={run.muted ? svgColor(page.accent) : "#141a17"}>{run.text}</text>)}
    </svg>)}</div>
    <details className="accessible-document">
      <summary>Lire le document en texte</summary>
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
      setNotice(`Dossier prêt : ${next.days.length} journée(s). Les pièces affichées correspondent aux paramètres validés.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Vérifiez les paramètres du dossier."); }
  };
  const prepareContinuation = (checkpoint: Checkpoint) => {
    const start = continuationStart(checkpoint);
    setContinuation(checkpoint); setForm(current => ({ ...current, start, seed: checkpoint.seed })); setError("");
    setNotice(`Reprise prête pour le ${displayDate(start)} : lots et commandes conservés. Vérifiez les réglages d'activité, puis générez le dossier suivant.`);
  };
  const loadContinuation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget, file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_CHECKPOINT_BYTES) throw new Error("Fichier trop volumineux : 25 Mo maximum. Choisissez stock-reprise.json.");
      prepareContinuation(parseCheckpointFile(await file.text()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de lire ce fichier de reprise."); }
    finally { input.value = ""; }
  };
  const archive = async () => {
    const pendingNotice = "Préparation de l’archive…";
    setBusy(true); setError(""); setNotice(pendingNotice);
    try {
      const { options, opening } = scenario;
      const zip = await createArchive({ options, opening, today: formatParisDate() });
      download(zip, `dossier-${options.start}-${options.seed}.zip`, "application/zip");
      setNotice(current => current === pendingNotice ? "Archive prête. Ouvrez le guide du dossier pour retrouver les pièces à utiliser dans Kookia." : current);
    } catch (cause) {
      setNotice(current => current === pendingNotice ? "" : current);
      setError(current => current || (cause instanceof Error ? cause.message : "L’archive n’a pas pu être créée."));
    } finally { setBusy(false); }
  };
  return <>
    <div className="workspace">
      <section className="settings panel" aria-labelledby="settings-title">
        <h2 id="settings-title" className="section-heading"><span className="section-icon"><SlidersHorizontal size={18} aria-hidden="true" /></span>Réglages du dossier</h2>
        <form onSubmit={generate}>
          <Settings value={form} onChange={setForm}/>
          <details className="continuation"><summary>Reprendre les stocks d’un dossier</summary>
            <p className="hint">Charger stock-reprise.json (ou scenario.json version 2). Lecture locale uniquement. Les lots et commandes en attente sont conservés ; les réglages d’activité restent ceux du formulaire.</p>
            <label>Fichier de reprise<input type="file" accept=".json,application/json" onChange={loadContinuation}/></label>
            <button type="button" className="secondary" onClick={() => { try { prepareContinuation(scenario.checkpoint); } catch (cause) { setError(cause instanceof Error ? cause.message : "Reprise impossible."); } }}>Continuer après le dossier affiché</button>
            {continuation && <><p className="period-note">Reprise de la clôture du {displayDate(continuation.asOf)} : {continuation.lots.length} lots et {continuation.pendingOrders.length} commandes en attente. Début obligatoire : {displayDate(continuationStart(continuation))}.</p>
              <button type="button" className="secondary" onClick={() => { setContinuation(null); setNotice("Reprise retirée des réglages. La prochaine génération démarrera avec un stock nul, sans modifier le dossier affiché."); }}>Retirer la reprise</button></>}
          </details>
          <button className="generate-button" type="submit">Générer {form.days || "…"} jours de documents</button>
          {dirty && <p className="pending" role="status">Réglages modifiés : générez pour mettre à jour le dossier.</p>}
        </form>
      </section>
      <section className="results" aria-labelledby="dossier-title">
        <div role="status" className="status">{notice}</div>{error && <p role="alert" className="error">{error}</p>}
        <div className="dossier panel">
          <div className="dossier-heading">
            <div>
              {dirty && <span className="pending-badge">Version précédente</span>}
              <h2 id="dossier-title">{scenario.options.name}</h2>
              <p>Du {displayDate(scenario.options.start)} au {displayDate(scenario.days.at(-1)!.date)} · Dossier n° {scenario.options.seed}</p>
            </div>
            <button disabled={busy} onClick={archive}><Download size={16} aria-hidden="true" />{busy ? "Préparation…" : "Télécharger le ZIP"}</button>
          </div>
          <div className="export-actions">
            <button className="secondary" disabled={!ready.length} onClick={() => download(salesCsv(ready), readySalesFilename(today), "text/csv;charset=utf-8")}>CSV jusqu’à aujourd’hui</button>
            <button className="secondary" onClick={() => download(JSON.stringify(scenario.checkpoint, null, 2), "stock-reprise.json", "application/json")}>Télécharger l’état de reprise</button>
          </div>
          <p className="hint">{ready.length ? "Le ZIP inclut le CSV des ventes jusqu’à aujourd’hui." : "Aucune vente à importer à ce jour dans ce dossier."} Utilisez le dossier dans un espace de test.</p>
        </div>
        {hasFutureDays && <p className="future-note">Pour les ventes à venir, importez le fichier du jour à partir de la date indiquée dans son nom.</p>}
        {scenario.options.start < today && <p className="future-note">Pour les jours passés, les ventes gardent la date du service. « Produire » dans Recettes et « Faire l’inventaire » dans Stocks enregistrent la date de saisie.</p>}
        <div className="summary">
          <div className="panel"><span>Pièces PDF</span><strong>{docs.length}</strong></div>
          <div className="panel"><span>Jours du dossier</span><strong>{scenario.days.length}</strong></div>
          <div className="panel"><span>Encaissements TTC du scénario</span><strong>{money(scenario.days.reduce((sum, day) => sum + day.collected, 0))}</strong></div>
        </div>
        <ScenarioSummary scenario={scenario}/>
        <section className="panel" aria-labelledby="documents-title">
          <h2 id="documents-title" className="section-heading"><span className="section-icon"><FileText size={18} aria-hidden="true" /></span>Consulter les pièces</h2>
          <div className="filters">
            <label>Type de pièce<select value={kind} onChange={e => setKind(e.target.value)}>
              <option value="all">Toutes les pièces</option>
              {Object.entries(labels).filter(([key]) => docs.some(doc => doc.kind === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Date de pièce<select value={date} onChange={e => setDate(e.target.value)}>
              <option value="">Toutes les dates</option>
              {documentDates.map(date => <option key={date} value={date}>{displayDate(date)}</option>)}
            </select></label>
            <label>Document<select value={selected?.id ?? ""} onChange={e => setSelectedId(e.target.value)}>
              {filtered.length === 0 && <option value="">Aucune pièce</option>}
              {filtered.map(doc => <option key={doc.id} value={doc.id}>{doc.date} · {doc.title} · {doc.kind === "order" ? doc.recipient : doc.issuer}</option>)}
            </select></label>
          </div>
          {selected ? <Preview doc={selected}/> : <p className="empty">Aucune pièce pour ce filtre. Essayez une autre date ou un autre type de pièce.</p>}
        </section>
      </section>
    </div>
    <details className="coverage panel"><summary>Parcours de saisie et couverture des documents</summary><p>Commencez par l'établissement, les fournisseurs, les produits et les recettes. Puis suivez les opérations dans l'ordre de la journée.</p>
      <ol>{workflowEntries.map(({ kind, label, text }) => <li key={kind}><strong>{label}</strong><p>{text}</p></li>)}</ol>
      <p>Les préférences, comptes et connexions de sources se règlent dans Kookia. L'historique et les rapports sont calculés à partir des opérations. Il n'existe pas d'import universel de ces PDF.</p>
    </details>
  </>;
}
