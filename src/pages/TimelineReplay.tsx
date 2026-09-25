import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Button from "../components/common/Button";
import { getTimelineReplay, type TimelineReplay } from "../services/timelineService";
import "../styles/Workspace.css";
import "./TimelineReplay.css";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

function date(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium" })
    .format(new Date(`${value}T12:00:00.000Z`));
}

function quantity(value: number, unit: string) {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${unit}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function provenanceLabel(replay: TimelineReplay) {
  if (replay.provenance === "demo_simulation") return "Simulation de démonstration";
  if (replay.provenance === "mixed") return "Données mixtes";
  return "Ventes enregistrées";
}

export default function TimelineReplay() {
  const { id = "" } = useParams();
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [requestState, setRequestState] = useState<{ key: string; result?: TimelineReplay; error?: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const requestKey = id ? `${id}:${attempt}` : "";
  const currentState = requestState?.key === requestKey ? requestState : null;
  const replay = currentState?.result;
  const loading = !!requestKey && !currentState;
  const error = currentState?.error ?? (!id ? "Bac de rejeu introuvable." : "");

  useEffect(() => {
    if (!requestKey) return;
    let active = true;
    getTimelineReplay(id).then((result) => {
      if (active) setRequestState({ key: requestKey, result });
    }).catch((cause: unknown) => {
      if (active) setRequestState({ key: requestKey,
        error: cause instanceof Error ? cause.message : "Le bac de rejeu est indisponible." });
    });
    return () => { active = false; };
  }, [id, requestKey]);

  useEffect(() => {
    if (loading) return;
    if (replay) headingRef.current?.focus();
    else if (error) retryRef.current?.focus();
  }, [error, loading, replay]);

  return <div className="workspace-page timeline-replay-page">
    <Link className="timeline-replay-back" to={`/history${location.search}`}>← Retour à l’historique</Link>
    <h1 ref={headingRef} tabIndex={-1}>Bac de rejeu isolé</h1>
    <p className="timeline-replay-boundary" role="note">
      Cette copie rejoue uniquement la décision enregistrée. Elle ne crée pas de commande dans l’espace courant,
      ne transmet rien au fournisseur et ne modifie ni stock ni réception.
    </p>
    {loading && <p role="status" aria-live="polite">Chargement du geste rejoué…</p>}
    {error && <div className="timeline-replay-error" role="alert">
      <p>{error}</p>
      {id && <Button ref={retryRef} type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
        Réessayer
      </Button>}
    </div>}
    {replay && <>
      <section className="timeline-replay-source" aria-labelledby="timeline-replay-source-title">
        <h2 id="timeline-replay-source-title">Décision source</h2>
        <p>{replay.decision === "purchase_suggestion_added" ? "Proposition ajoutée" : "Proposition écartée"}
          {` · ${provenanceLabel(replay)}`}</p>
        <p>Enregistrée le {dateTime(replay.sourceDecisionAt)} · recommandation calculée au {date(replay.asOfDate)}
          {` pour le ${date(replay.forecastDate)}.`}</p>
      </section>
      <section className="timeline-replay-result" aria-labelledby="timeline-replay-result-title">
        <h2 id="timeline-replay-result-title">Résultat dans le bac séparé</h2>
        <h3>{replay.suggestion.productName}</h3>
        <dl>
          <div><dt>Besoin prévu</dt><dd>{quantity(replay.suggestion.forecastNeed, replay.suggestion.unit)}</dd></div>
          {replay.suggestion.estimatedQuantity !== null && <div><dt>Quantité proposée à l’origine</dt>
            <dd>{quantity(replay.suggestion.estimatedQuantity, replay.suggestion.unit)}</dd></div>}
          <div><dt>Stock compté à la décision</dt><dd>{replay.suggestion.countedStock === null
            ? "Non connu" : quantity(replay.suggestion.countedStock, replay.suggestion.unit)}</dd></div>
          {replay.suggestion.countDate && <div><dt>Date du comptage</dt><dd>{date(replay.suggestion.countDate)}</dd></div>}
          <div><dt>Prix catalogue archivé</dt><dd>{currency(replay.sandboxOutcome.currentUnitPrice)} / {replay.suggestion.unit}</dd></div>
          <div><dt>Geste rejoué</dt><dd>{replay.sandboxOutcome.kind === "draft_line" && replay.sandboxOutcome.quantity !== null
            ? `Ligne hypothétique de ${quantity(replay.sandboxOutcome.quantity, replay.suggestion.unit)}`
            : "Proposition écartée, sans ligne"}</dd></div>
          {replay.sandboxOutcome.estimatedCost !== null && <div><dt>Coût indicatif de la ligne</dt>
            <dd>{currency(replay.sandboxOutcome.estimatedCost)}</dd></div>}
        </dl>
        <p>{replay.suggestion.reason}</p>
        <p>Le prix est celui archivé au moment de la décision, à titre indicatif. Ce résultat n’est ni une commande
          ni un montant comptable ; il ne reflète pas le stock courant.</p>
      </section>
    </>}
  </div>;
}
