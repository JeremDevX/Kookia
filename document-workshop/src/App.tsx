import React, { useEffect, useMemo, useState } from "react";
import { identity, money } from "./catalog";
import { createDocuments, salesCsv, workflows } from "./documents";
import type { Document } from "./documents";
import { download, pdfBytes, zipBytes } from "./exports";
import { layoutDocument } from "./layout";
import { displayDate, generateScenario, localToday } from "./scenario";
import type { Options } from "./scenario";
import { Settings } from "./Settings";
import { archiveFiles, labels, readySales } from "./dossier";

const initial: Options = { name: identity.name, address: identity.address, city: identity.city, email: identity.email,
  start: localToday(), days: 7, covers: 40, seed: 1, incident: "normal", variationPercent: 20, lossPercent: 2, starterPercent: 65, dessertPercent: 60, incidentEvery: 3 };
function Preview({ doc }: { doc: Document }) {
  const pages = useMemo(() => layoutDocument(doc), [doc]);
  return <section aria-label="Document sélectionné" className="preview">
    <div className="preview-toolbar"><div><span className="eyebrow">{doc.date}</span><h2>{doc.title}</h2></div>
      <button onClick={() => download(pdfBytes(doc), `${doc.id}.pdf`, "application/pdf")}>Télécharger le PDF</button></div>
    <aside className="workflow"><strong>Utilisation dans Kookia</strong><p>{doc.workflow}</p></aside>
    <div className="paper-stack">{pages.map((page, pageIndex) => <svg key={pageIndex} className="paper" viewBox="0 0 595 842" role="img" aria-label={`${doc.title}, page ${pageIndex + 1}`}>
      <rect width="595" height="842" fill="white"/>
      <rect x="40" y="17" width="35" height="3" fill="#a6663b"/>
      {page.runs.map((run, i) => <text key={i} x={run.x} y={run.y} fontSize={run.size} fontFamily="Helvetica, Arial, sans-serif" fontWeight={run.bold ? 700 : 400} fill={run.muted ? "#52645c" : "#14291f"}>{run.text}</text>)}
    </svg>)}</div>
    <details className="accessible-document"><summary>Lire le document en texte</summary>
      <p>{doc.issuer} → {doc.recipient}</p>{doc.sections.map((section, i) => <section key={i}><h3>{section.heading}</h3><div className="table-scroll"><table><thead><tr>{section.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{section.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}</tbody></table></div></section>)}
      {doc.notes.map(note => <p key={note}>{note}</p>)}
    </details>
  </section>;
}
export default function App() {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [form, setForm] = useState<Options>(initial);
  const [scenario, setScenario] = useState(() => generateScenario(initial));
  const docs = useMemo(() => createDocuments(scenario), [scenario]);
  const [selectedId, setSelectedId] = useState(docs[0].id);
  const [kind, setKind] = useState("all");
  const [date, setDate] = useState(initial.start);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = docs.filter(doc => (kind === "all" || doc.kind === kind) && (!date || doc.date === date));
  const selected = filtered.find(doc => doc.id === selectedId) ?? filtered[0];
  const dirty = Object.entries(scenario.options).some(([key, value]) => form[key as keyof Options] !== value);
  const ready = readySales(scenario, today);
  const futureDays = scenario.days.filter(day => day.date > today).length;
  const generate = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    try {
      const next = generateScenario(form);
      setScenario(next); setKind("all"); setDate(next.options.start);
      setNotice(`Dossier prêt : ${next.days.length} journée(s). Les pièces affichées correspondent aux paramètres validés.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Vérifiez les paramètres du dossier."); }
  };
  const archive = async () => {
    setBusy(true); setError(""); setNotice("Préparation de l'archive…");
    // Yield so the busy status is painted before processing a long period.
    await new Promise(resolve => setTimeout(resolve, 30));
    try {
      download(zipBytes(archiveFiles(scenario, docs)), `dossier-${scenario.options.start}-${scenario.options.seed}.zip`, "application/zip");
      setNotice(`Archive prête : ${docs.length} PDF, CSV quotidiens, guide et journal chiffré.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "L'archive n'a pas pu être créée."); }
    finally { setBusy(false); }
  };
  return <>
    <header className="masthead"><a href="#main" className="brand"><span className="mark">S</span><span>{scenario.options.name}<small>Atelier documentaire</small></span></a><span className="local-badge">Local · indépendant de Kookia</span></header>
    <main id="main">
      <div className="intro"><span className="eyebrow">Le bureau du restaurant</span><h1>Votre restaurant.<br/><em>Vos journées, prêtes à l’emploi.</em></h1><p>Choisissez une période, ajustez l’activité et emportez toutes les pièces. Passé ou futur : un seul dossier, rangé jour par jour.</p></div>
      <div className="workspace">
        <aside className="settings"><form onSubmit={generate}>
          <Settings value={form} onChange={setForm}/>
          <button className="primary" type="submit">Générer {form.days || "…"} jours de documents</button>
          {dirty && <p className="pending" role="status">Réglages modifiés : générez pour mettre à jour le dossier.</p>}
        </form><div className="export-panel"><h3>Emporter le dossier</h3><button disabled={busy} onClick={archive}>{busy ? "Préparation…" : "Télécharger tout (.zip)"}</button>
          <button className="secondary" disabled={!ready.days.length} onClick={() => download(salesCsv(ready), `ventes-jusqu-au-${today}.csv`, "text/csv;charset=utf-8")}>CSV jusqu’à aujourd’hui</button>
          <p className="hint">Le ZIP inclut toute la période, avec un CSV par jour. Le bouton CSV exclut les dates futures. Aucun accès à votre compte.</p></div>
        </aside>
        <div className="results"><div role="status" className="status">{notice}</div>{error && <p role="alert" className="error">{error}</p>}
          <div className="dossier-heading"><div><span className="eyebrow">Votre dossier généré</span><h2>{scenario.options.name}</h2><p>Du {displayDate(scenario.options.start)} au {displayDate(scenario.days.at(-1)!.date)} · Dossier n° {scenario.options.seed}</p></div><span className="ready-badge">{dirty ? "Version précédente" : "Prêt à télécharger"}</span></div>
          {futureDays > 0 && <p className="future-note">{futureDays} journée(s) à venir sont prêtes. Conservez le ZIP et utilisez le dossier de chaque date au fil des jours : Kookia accepte les ventes et productions à partir de leur date, sans nouvelle génération.</p>}
          <div className="summary"><div><strong>{docs.length}</strong><span>pièces PDF</span></div><div><strong>{scenario.days.length}</strong><span>journée(s)</span></div><div><strong>{money(scenario.days.reduce((sum, day) => sum + day.collected, 0))}</strong><span>encaissé TTC</span></div></div>
          <h3>Consulter les pièces</h3><div className="filters"><label>Type de pièce<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">Toutes les pièces</option>{Object.entries(labels).filter(([key]) => docs.some(doc => doc.kind === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Journée<select value={date} onChange={e => setDate(e.target.value)}><option value="">Toute la période</option>{scenario.days.map(day => <option key={day.date} value={day.date}>{displayDate(day.date)}</option>)}</select></label>
            <label>Document<select value={selected?.id ?? ""} onChange={e => setSelectedId(e.target.value)}>{filtered.length === 0 && <option value="">Aucune pièce</option>}{filtered.map(doc => <option key={doc.id} value={doc.id}>{doc.date} · {doc.title} · {doc.kind === "order" ? doc.recipient : doc.issuer}</option>)}</select></label></div>
          {selected ? <Preview doc={selected}/> : <p className="empty">Aucune pièce pour ce filtre. Choisissez un déroulement avec incident pour obtenir les avoirs ou régularisations.</p>}
        </div>
      </div>
      <details className="coverage"><summary>Parcours de saisie et couverture des documents</summary><p>Commencez par l'établissement, les fournisseurs, les produits et les recettes. Puis suivez les opérations dans l'ordre de la journée.</p>
        <ol>{Object.entries(workflows).map(([key, text]) => <li key={key}><strong>{labels[key as keyof typeof labels]}</strong><p>{text}</p></li>)}</ol>
        <p>Les préférences, comptes et connexions de sources se règlent dans Kookia. L'historique et les rapports sont calculés à partir des opérations. Il n'existe pas d'import universel de ces PDF.</p>
      </details>
    </main><footer>{scenario.options.name} · Achats, cuisine & service</footer>
  </>;
}
