import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import { getTimeline, type TimelineEvent, type TimelineProvenance, type TimelineResult } from "../services/timelineService";
import { formatLocalISODate } from "../utils/date";
import "../styles/Workspace.css";
import "./Timeline.css";

const today = formatLocalISODate(new Date());
const historyStart = "2023-05-02";
const initialFrom = `${today.slice(0, 7)}-01`;

const provenanceLabels: Record<TimelineProvenance, string> = {
  source: "Archive source",
  recorded: "Enregistré",
  simulation: "Simulation",
  assumption: "Hypothèse",
  unknown: "Inconnu",
};

function displayDate(value: string | null, includeTime = false) {
  if (!value) return "Date inconnue";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T12:00:00.000Z` : value);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", dateStyle: "medium", ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(parsed);
}

function dayKey(value: string | null) {
  if (!value) return "unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function eventTime(event: TimelineEvent) {
  return event.effectiveAt && !/^\d{4}-\d{2}-\d{2}$/.test(event.effectiveAt)
    ? displayDate(event.effectiveAt, true) : displayDate(event.effectiveAt);
}

export default function Timeline() {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [asOf, setAsOf] = useState(today);
  const [requestAttempt, setRequestAttempt] = useState(0);
  const rangeDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  const validRequest = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    /^\d{4}-\d{2}-\d{2}$/.test(asOf) && from >= historyStart && asOf >= historyStart && from <= to && rangeDays <= 30 &&
    to <= today && asOf <= today;
  const requestKey = validRequest ? `${from}:${to}:${asOf}:${requestAttempt}` : "";
  const [requestState, setRequestState] = useState<{ key: string; result?: TimelineResult; error?: string } | null>(null);
  const currentState = requestState?.key === requestKey ? requestState : null;
  const timeline = currentState?.result ?? null;
  const error = validRequest ? currentState?.error ?? "" : "Choisissez une période et une date de connaissance valides.";
  const loading = validRequest && !currentState;
  const grouped = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of timeline?.events ?? []) {
      const key = dayKey(event.effectiveAt);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()];
  }, [timeline]);

  useEffect(() => {
    if (!requestKey) return;
    let active = true;
    const [from, to, knownAsOf] = requestKey.split(":");
    getTimeline(from, to, knownAsOf).then((result) => {
      if (active) setRequestState({ key: requestKey, result });
    }).catch((cause: unknown) => {
      if (active) {
        setRequestState({ key: requestKey,
          error: cause instanceof Error ? cause.message : "La chronologie est indisponible." });
      }
    });
    return () => { active = false; };
  }, [requestKey]);

  return <div className="workspace-page timeline-page">
    <header className="workspace-header"><div>
      <p className="workspace-eyebrow">Historique consultable</p>
      <h1>Histoire sur quatre années</h1>
      <p className="workspace-subtitle">Parcourez les pièces, le stock, les recettes, les services et les décisions sans modifier les données actuelles.</p>
    </div></header>

    <section className="timeline-controls" aria-label="Filtres de chronologie">
      <label htmlFor="timeline-from">Du (service ou effet)
        <input id="timeline-from" type="date" min={historyStart} max={today} value={from}
          onChange={(event) => setFrom(event.target.value)} />
      </label>
      <label htmlFor="timeline-to">Au
        <input id="timeline-to" type="date" min={historyStart} max={today} value={to}
          onChange={(event) => setTo(event.target.value)} />
      </label>
      <label htmlFor="timeline-as-of">Connu au
        <input id="timeline-as-of" type="date" min={historyStart} max={today} value={asOf}
          onChange={(event) => setAsOf(event.target.value)} />
      </label>
      <p>La période couvre {displayDate(from)} – {displayDate(to)} (31 jours maximum). L’état est filtré par « Connu au »; une pièce modifiée ensuite est masquée plutôt que réécrite dans le passé.</p>
    </section>

    <section className="timeline-key" aria-label="Origine et niveau de preuve">
      {(Object.entries(provenanceLabels) as Array<[TimelineProvenance, string]>).map(([key, label]) =>
        <span className={`timeline-badge provenance-${key}`} key={key}>{label}</span>)}
      <p>Une transcription d’archive n’établit pas une livraison. Les hypothèses et simulations ne sont pas des observations.</p>
    </section>

    <div className="timeline-status">
      <span role={error ? "alert" : "status"} aria-live="polite">
        {loading ? "Chargement de l’historique…" : error || (timeline ? `${timeline.count} événement(s) pour la période.` : "")}
      </span>
      {currentState?.error && <Button type="button" variant="outline" size="sm"
        onClick={() => setRequestAttempt((attempt) => attempt + 1)}>Réessayer</Button>}
    </div>
    {timeline?.truncated && <p className="timeline-truncated" role="status">Période dense : seuls les premiers événements sont affichés. Choisissez une période plus courte pour continuer à parcourir l’historique.</p>}
    {timeline && timeline.events.length === 0 && <p className="workspace-empty">Aucun événement disponible avec ces dates et ces informations connues.</p>}
    {timeline && timeline.events.length > 0 && <div className="timeline-days">
      {grouped.map(([key, events]) => <section className="timeline-day" key={key}>
        <h2>{key === "unknown" ? "Date d’effet inconnue" : displayDate(key)}</h2>
        <ol>
          {events.map((event) => <li key={event.id}>
            <article className="timeline-event">
              <div className="timeline-event-heading">
                <h3>{event.label}</h3><span className={`timeline-badge provenance-${event.provenance}`}>{provenanceLabels[event.provenance]}</span>
              </div>
              <p>{event.detail}</p>
              <p className="timeline-event-times">
                <span>Effet : {eventTime(event)}</span>
                {event.knownAt && <span>Connu le : {displayDate(event.knownAt, true)}</span>}
                {event.recordedAt && <span>Enregistré le : {displayDate(event.recordedAt, true)}</span>}
              </p>
              {event.qualifier && <p className="timeline-qualifier">{event.qualifier}</p>}
              {event.href && <Link to={event.href} aria-label={`Ouvrir ${event.label} dans l’espace actuel`}>Ouvrir la rubrique actuelle</Link>}
            </article>
          </li>)}
        </ol>
      </section>)}
    </div>}
    <p className="timeline-read-only">Lecture seule : les liens ouvrent les espaces actuels. Ils ne rejouent pas les événements et ne modifient pas le stock historique. Les documents n’ont pas de journal de versions; leur première saisie et leurs états antérieurs restent inconnus.</p>
  </div>;
}
