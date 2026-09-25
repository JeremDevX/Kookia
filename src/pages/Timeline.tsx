import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { createTimelineReplay, getTimeline, type TimelineEvent, type TimelineProvenance, type TimelineResult } from "../services/timelineService";
import { formatLocalISODate } from "../utils/date";
import { filterTimelineEvents, TIMELINE_VISIBLE_BATCH_SIZE } from "./timelineSelectors";
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
  const navigate = useNavigate();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [asOf, setAsOf] = useState(today);
  const [requestAttempt, setRequestAttempt] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(TIMELINE_VISIBLE_BATCH_SIZE);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsStatusRef = useRef<HTMLParagraphElement>(null);
  const loadMoreFocusPending = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  const [replayRequest, setReplayRequest] = useState<{ decisionId: string; loading: boolean; error?: string } | null>(null);
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
  const filteredEvents = useMemo(() => filterTimelineEvents(timeline?.events ?? [], search), [timeline, search]);
  const visibleEvents = useMemo(() => filteredEvents.slice(0, visibleCount), [filteredEvents, visibleCount]);
  const remainingEvents = filteredEvents.length - visibleEvents.length;
  const moreEventsCount = Math.min(TIMELINE_VISIBLE_BATCH_SIZE, remainingEvents);
  const loadedCount = timeline?.events.length ?? 0;
  const timelineStatus = timeline ? `${timeline.count.toLocaleString("fr-FR")} événement${timeline.count === 1 ? "" : "s"} pour la période.` : "";
  const resultsStatus = filteredEvents.length === 0 ? "Aucun événement ne correspond à cette recherche." :
    `${visibleEvents.length.toLocaleString("fr-FR")} événement${visibleEvents.length === 1 ? "" : "s"} affiché${visibleEvents.length === 1 ? "" : "s"} sur ${search
      ? `${filteredEvents.length.toLocaleString("fr-FR")} résultat${filteredEvents.length === 1 ? "" : "s"} de recherche (${loadedCount.toLocaleString("fr-FR")} événement${loadedCount === 1 ? "" : "s"} récupéré${loadedCount === 1 ? "" : "s"})`
      : `${filteredEvents.length.toLocaleString("fr-FR")} événement${filteredEvents.length === 1 ? "" : "s"} récupéré${filteredEvents.length === 1 ? "" : "s"} pour cette période`}.`;
  const grouped = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of visibleEvents) {
      const key = dayKey(event.effectiveAt);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()];
  }, [visibleEvents]);

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

  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (currentState?.error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [currentState, loading]);

  useEffect(() => {
    if (!loadMoreFocusPending.current || visibleCount < filteredEvents.length) return;
    loadMoreFocusPending.current = false;
    resultsStatusRef.current?.focus();
  }, [filteredEvents.length, visibleCount]);

  const retryHistory = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE);
    setRequestAttempt((attempt) => attempt + 1);
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE);
    searchInputRef.current?.focus();
  };

  const showMoreEvents = () => {
    const nextCount = Math.min(visibleCount + TIMELINE_VISIBLE_BATCH_SIZE, filteredEvents.length);
    loadMoreFocusPending.current = nextCount >= filteredEvents.length;
    setVisibleCount(nextCount);
  };

  const replayDecision = async (decisionId: string) => {
    setReplayRequest({ decisionId, loading: true });
    try {
      const replay = await createTimelineReplay(decisionId);
      navigate(`/history/replay/${replay.id}`);
    } catch (cause) {
      setReplayRequest({ decisionId, loading: false,
        error: cause instanceof Error ? cause.message : "Le bac de rejeu est indisponible." });
    }
  };

  return <div className="workspace-page timeline-page">
    <header className="workspace-header"><div>
      <p className="workspace-eyebrow">Historique consultable</p>
      <h1 ref={headingRef} tabIndex={-1}>Histoire sur quatre années</h1>
      <p className="workspace-subtitle">Parcourez les pièces, le stock, les recettes, les services et les décisions sans modifier les données actuelles.</p>
    </div></header>

    <section className="timeline-controls" aria-label="Filtres de chronologie">
      <label htmlFor="timeline-from">Du (service ou effet)
        <input id="timeline-from" type="date" min={historyStart} max={today} value={from}
          onChange={(event) => { setFrom(event.target.value); setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE); }} />
      </label>
      <label htmlFor="timeline-to">Au
        <input id="timeline-to" type="date" min={historyStart} max={today} value={to}
          onChange={(event) => { setTo(event.target.value); setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE); }} />
      </label>
      <label htmlFor="timeline-as-of">Connu au
        <input id="timeline-as-of" type="date" min={historyStart} max={today} value={asOf}
          onChange={(event) => { setAsOf(event.target.value); setVisibleCount(TIMELINE_VISIBLE_BATCH_SIZE); }} />
      </label>
      <p>La période couvre {displayDate(from)} – {displayDate(to)} (31 jours maximum). L’état est filtré par « Connu au »; une pièce modifiée ensuite est masquée plutôt que réécrite dans le passé.</p>
    </section>

    <section className="timeline-key" aria-label="Origine et niveau de preuve">
      {(Object.entries(provenanceLabels) as Array<[TimelineProvenance, string]>).map(([key, label]) =>
        <span className={`timeline-badge provenance-${key}`} key={key}>{label}</span>)}
      <p>Une transcription d’archive n’établit pas une livraison. Les hypothèses et simulations ne sont pas des observations.</p>
    </section>

    <div className="timeline-status">
      <span role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
        {loading ? "Chargement de l’historique…" : error || timelineStatus}
      </span>
      {currentState?.error && <Button ref={retryButtonRef} type="button" variant="outline" size="sm"
        onClick={retryHistory}>Réessayer</Button>}
    </div>
    {timeline?.truncated && <p className="timeline-truncated" role="status">Période dense : seuls les premiers événements sont affichés. Choisissez une période plus courte pour continuer à parcourir l’historique.</p>}
    {timeline && timeline.events.length === 0 && <p className="workspace-empty">Aucun événement disponible avec ces dates et ces informations connues.</p>}
    {timeline && timeline.events.length > 0 && <>
      <form className="timeline-search" onSubmit={applySearch}>
        <label htmlFor="timeline-search">Rechercher dans l’historique</label>
        <div className="timeline-search-actions">
          <input ref={searchInputRef} id="timeline-search" type="search" value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)} aria-describedby="timeline-search-help" />
          <Button type="submit" variant="outline">Rechercher</Button>
          {(search || searchDraft) && <Button type="button" variant="outline" onClick={clearSearch}>Effacer</Button>}
        </div>
        <p id="timeline-search-help">Recherche dans les libellés, détails et précisions affichés.</p>
      </form>
      <p ref={resultsStatusRef} className="timeline-results-status" role="status" aria-live="polite" aria-atomic="true" tabIndex={-1}>
        {resultsStatus}
      </p>
      {filteredEvents.length === 0 ? <p className="workspace-empty">Modifiez le terme ou effacez la recherche pour retrouver l’historique.</p> : <>
        <div className="timeline-days">
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
                  {event.replayDecisionId && <>
                    <Button type="button" variant="outline" size="sm" disabled={replayRequest?.loading === true}
                      aria-label={`Rejouer dans un bac isolé : ${event.label}`}
                      onClick={() => void replayDecision(event.replayDecisionId!)}>
                      {replayRequest?.decisionId === event.replayDecisionId && replayRequest.loading
                        ? "Ouverture du bac…" : "Rejouer ce geste"}
                    </Button>
                    {replayRequest?.decisionId === event.replayDecisionId && replayRequest.error &&
                      <p className="timeline-replay-feedback" role="alert">{replayRequest.error}</p>}
                  </>}
                </article>
              </li>)}
            </ol>
          </section>)}
        </div>
        {visibleEvents.length < filteredEvents.length && <div className="timeline-load-more">
          <Button type="button" variant="outline" onClick={showMoreEvents}>
            {moreEventsCount === 1 ? "Afficher l’événement suivant" : `Afficher les ${moreEventsCount} événements suivants`}
          </Button>
        </div>}
      </>}
    </>}
    <p className="timeline-read-only">Lecture seule : les liens ouvrent les espaces actuels. « Rejouer ce geste » ouvre un bac séparé à partir d’une décision d’achat conservée ; aucun ordre, réception ou mouvement de stock n’est créé dans l’espace courant. Les documents n’ont pas de journal de versions ; leur première saisie et leurs états antérieurs restent inconnus.</p>
  </div>;
}
