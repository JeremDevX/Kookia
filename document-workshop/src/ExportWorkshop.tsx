import { useEffect, useMemo, useState, type ChangeEvent, type SubmitEvent } from "react";
import { ArrowDown, Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import { formatParisDate } from "../../shared/parisDate";
import { displayDate } from "./calendar";
import { workflowEntries } from "./documentModel";
import { createDocuments, readySales, readySalesFilename, salesCsv } from "./documents";
import { download } from "./exports";
import { createArchive } from "./archiveExport";
import { defaultScenarioOptions, generateScenario } from "./scenario";
import type { Checkpoint, Options } from "./model";
import { continuationStart, MAX_CHECKPOINT_BYTES, parseCheckpointFile } from "./continuation";
import { ScenarioSummary } from "./ScenarioSummary";
import { Settings } from "./Settings";
import WorkshopDocuments from "./WorkshopDocuments";
import "./exportWorkshop.css";

const initial = defaultScenarioOptions(formatParisDate(), 7);
const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
type Feedback = { type: "busy" | "success" | "error"; text: string };

function ExportFeedback({ value }: { value: Feedback | null }) {
  return <>
    <p role="status" className="status">{value?.type !== "error" ? value?.text : null}</p>
    {value?.type === "error" && <p role="alert" className="error">{value.text}</p>}
  </>;
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
  const [documentRevision, setDocumentRevision] = useState(0);
  const [generationFeedback, setGenerationFeedback] = useState<Feedback | null>(null);
  const [archiveFeedback, setArchiveFeedback] = useState<Feedback | null>(null);
  const [resumeFeedback, setResumeFeedback] = useState<Feedback | null>(null);
  const { docs, sales, documentDates, collected } = useMemo(() => {
    const result = createDocuments(scenario);
    return { ...result,
      documentDates: [...new Set([...scenario.days.map(day => day.date), ...result.docs.map(doc => doc.date)])].sort(),
      collected: scenario.days.reduce((sum, day) => sum + day.collected, 0),
    };
  }, [scenario]);
  const dirty = JSON.stringify(scenario.options) !== JSON.stringify(form) || JSON.stringify(scenario.opening) !== JSON.stringify(continuation);
  const ready = readySales(sales, today);
  const hasFutureSales = sales.some(day => day.date > today && day.articles.size > 0);
  const preparingArchive = archiveFeedback?.type === "busy";
  const readingCheckpoint = resumeFeedback?.type === "busy";
  const start = scenario.options.start;
  const end = scenario.days.at(-1)!.date;

  const updateForm = (next: Options) => { setForm(next); setGenerationFeedback(null); };
  const generate = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preparingArchive || readingCheckpoint) return;
    try {
      const next = generateScenario(form, continuation ?? undefined);
      setScenario(next);
      setForm(next.options);
      setDocumentRevision(value => value + 1);
      setArchiveFeedback(null);
      setGenerationFeedback({ type: "success", text: "Dossier mis à jour." });
    } catch (cause) {
      setGenerationFeedback({ type: "error", text: cause instanceof Error ? cause.message : "Vérifiez les réglages du dossier." });
    }
  };

  const prepareContinuation = (checkpoint: Checkpoint) => {
    const start = continuationStart(checkpoint);
    setContinuation(checkpoint);
    setForm(current => ({ ...current, start, seed: checkpoint.seed }));
    setGenerationFeedback(null);
    setResumeFeedback({ type: "success", text: "Générez le dossier pour appliquer la reprise." });
  };
  const loadContinuation = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_CHECKPOINT_BYTES) {
      setResumeFeedback({ type: "error", text: "Fichier de reprise limité à 25 Mo." });
      input.value = "";
      return;
    }
    setResumeFeedback({ type: "busy", text: "Lecture du fichier…" });
    try {
      prepareContinuation(parseCheckpointFile(await file.text()));
    } catch {
      setResumeFeedback({ type: "error", text: "Fichier de reprise illisible ou incompatible. Utilisez le fichier JSON d’un dossier de cet atelier." });
    } finally { input.value = ""; }
  };

  const archive = async () => {
    if (preparingArchive) return;
    setArchiveFeedback({ type: "busy", text: "Préparation du ZIP…" });
    try {
      const { options, opening } = scenario;
      const zip = await createArchive({ options, opening, today: formatParisDate() });
      download(zip, `dossier-${options.start}-${options.seed}.zip`, "application/zip");
      setArchiveFeedback({ type: "success", text: "ZIP prêt." });
    } catch {
      setArchiveFeedback({ type: "error", text: "Création du ZIP impossible. Réessayez." });
    }
  };

  return <div className="export-workshop">
    <section className="panel dossier" aria-labelledby="dossier-title">
      <div className="dossier-heading">
        <div>
          <h2 id="dossier-title">{scenario.options.name}</h2>
          <p>{start === end
            ? <time dateTime={start}>{displayDate(start)}</time>
            : <>Du <time dateTime={start}>{displayDate(start)}</time> au <time dateTime={end}>{displayDate(end)}</time></>}
            {" · "}<span className="dossier-number">Dossier n° {scenario.options.seed}</span></p>
        </div>
        <button type="button" aria-disabled={preparingArchive} onClick={archive}>
          <Download size={18} aria-hidden="true" />Télécharger le ZIP
        </button>
      </div>
      <dl className="dossier-metrics">
        <div><dt>Jours</dt><dd>{scenario.days.length}</dd></div>
        <div><dt>Pièces PDF</dt><dd>{docs.length}</dd></div>
        <div><dt>Encaissements TTC simulés</dt><dd>{currency.format(collected / 100)}</dd></div>
      </dl>
      <div className="export-dossier-actions">
        <div className="export-actions">
          {ready.length > 0 && <button type="button" className="secondary" aria-describedby={hasFutureSales ? "export-ventes" : undefined}
            onClick={() => download(salesCsv(ready), readySalesFilename(today), "text/csv;charset=utf-8")}>
            <FileSpreadsheet size={16} aria-hidden="true" />CSV des ventes
          </button>}
          <button type="button" className="secondary" onClick={() => download(JSON.stringify(scenario.checkpoint, null, 2), "stock-reprise.json", "application/json")}>
            <RotateCcw size={16} aria-hidden="true" />Fichier de reprise des stocks
          </button>
        </div>
        <div className="export-dossier-links">
          <a href="#documents-title" className="workshop-link dossier-jump">Voir les pièces <ArrowDown size={16} aria-hidden="true" /></a>
          <a href="#activity-title" className="workshop-link dossier-jump">Voir l’activité</a>
        </div>
      </div>
      {(hasFutureSales || !ready.length) && <p className="hint export-sales-note" id="export-ventes">
        {ready.length ? "Le CSV regroupe les ventes jusqu’à aujourd’hui." : "Aucune vente à importer à ce jour."}
        {hasFutureSales && " Les CSV des ventes futures sont dans le ZIP. Importez-les à la date indiquée."}
      </p>}
      {dirty && <p className="dossier-dirty">Réglages modifiés. Les fichiers correspondent au dossier affiché. <a href="#generer-dossier" className="workshop-link">Appliquer les réglages</a></p>}
      <ExportFeedback value={archiveFeedback} />
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
          <Settings value={form} today={today} continuing={continuation !== null} onChange={updateForm} />
          <details className="continuation workshop-details">
            <summary><span>Reprendre un dossier</span>{continuation && <small>Reprise chargée</small>}</summary>
            {continuation && <div className="resume-summary">
              <p>Clôture du <time dateTime={continuation.asOf}>{displayDate(continuation.asOf)}</time></p>
              <p className="hint">{continuation.lots.length} {continuation.lots.length === 1 ? "lot" : "lots"} · {continuation.pendingOrders.length} {continuation.pendingOrders.length === 1 ? "commande en attente" : "commandes en attente"}</p>
              <button type="button" className="secondary" disabled={readingCheckpoint} onClick={() => {
                setContinuation(null);
                setGenerationFeedback(null);
                setResumeFeedback({ type: "success", text: "Reprise retirée. Le prochain dossier repartira avec un stock vide." });
              }}>Retirer la reprise</button>
            </div>}
            <div className="resume-actions">
              <label>Fichier de reprise<input type="file" accept=".json,application/json" aria-describedby="continuation-help"
                disabled={readingCheckpoint} onChange={loadContinuation} /></label>
              <p className="hint" id="continuation-help">Fichier stock-reprise.json ou scenario.json (version 2).</p>
              <button type="button" className="secondary" disabled={readingCheckpoint} onClick={() => {
                try { prepareContinuation(scenario.checkpoint); }
                catch (cause) { setResumeFeedback({ type: "error", text: cause instanceof Error ? cause.message : "Reprise impossible." }); }
              }}>Reprendre le dossier affiché</button>
            </div>
            <ExportFeedback value={resumeFeedback} />
          </details>
          <button className="generate-button" id="generer-dossier" type="submit" disabled={preparingArchive || readingCheckpoint}>Générer le dossier</button>
          <ExportFeedback value={generationFeedback} />
          {generationFeedback?.type === "success" && <a href="#documents-title" className="workshop-link dossier-jump">Voir les pièces mises à jour</a>}
        </form>
      </section>
      <div className="results">
        <WorkshopDocuments key={documentRevision} docs={docs} initialDate={start} documentDates={documentDates} />
        <ScenarioSummary scenario={scenario} />
        <details className="coverage panel">
          <summary><span>Guide d’import dans Kookia</span></summary>
          <p>Utilisez un espace de test. Commencez par renseigner le restaurant, les fournisseurs, les produits et les recettes.</p>
          {start < today && <p>Les ventes gardent la date du service. Kookia date les productions et inventaires manuels du jour de saisie.</p>}
          <ol>{workflowEntries.map(({ kind, label, text }) => <li key={kind}><strong>{label}</strong><p>{text}</p></li>)}</ol>
        </details>
      </div>
    </div>
  </div>;
}
