import { useClientPresentation } from "../features/members/workspaceContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { consumeFocusRestoreRequest } from "../utils/focusRestoration";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import { getTimeline, type TimelineEvent, type TimelineProvenance, type TimelineResult } from "../services/timelineService";
import { formatLocalISODate, isValidISODate } from "../utils/date";
import { watchTimelineToday } from "./timelineToday";
import "../styles/Workspace.css";
import "./Timeline.css";

const provenanceLabels: Record<TimelineProvenance, string> = {
  source: "Pièce source",
  recorded: "Enregistré",
  simulation: "Hors bilan",
  assumption: "À confirmer",
  unknown: "Non renseigné",
};
const SEARCH_MAX_LENGTH = 120;

interface TimelineRequestState {
  key: string;
  result?: TimelineResult;
  error?: string;
  loadingMore?: boolean;
  moreError?: boolean;
}

function displayDate(value: string | null, includeTime = false) {
  if (!value) return "Date inconnue";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly && !isValidISODate(value)) return "Date inconnue";
  const parsed = new Date(dateOnly ? `${value}T12:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", dateStyle: "medium", ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(parsed);
}

function dateParam(params: URLSearchParams, key: string, fallback: string) {
  return params.has(key) ? params.get(key) ?? "" : fallback;
}

function dayKey(value: string | null) {
  if (!value) return "unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isValidISODate(value) ? value : "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : formatLocalISODate(date);
}

function presentationQualifier(qualifier: string | undefined) {
  return qualifier?.replace(" et reste hors bilan.", ".")
    .replace("Cette vente est hors bilan.", "Vente exclue du calcul des ventes enregistrées.")
    .replace("Cet état de service est hors bilan et ne complète pas le calendrier enregistré.", "Cet état de service ne complète pas le calendrier enregistré.")
    .replace("hors bilan des livraisons", "sans effet sur le bilan des livraisons")
    .replace("Décision liée à des éléments hors bilan ; elle ne vaut pas un achat confirmé.", "Achat à confirmer.");
}

function eventTime(event: TimelineEvent) {
  return event.effectiveAt && !/^\d{4}-\d{2}-\d{2}$/.test(event.effectiveAt)
    ? displayDate(event.effectiveAt, true) : displayDate(event.effectiveAt);
}

export default function Timeline() {
  const clientPresentation = useClientPresentation();
  const labels = clientPresentation ? { ...provenanceLabels, simulation: "Non retenu au bilan" } : provenanceLabels;
  const [searchParams, setSearchParams] = useSearchParams();
  const [today, setToday] = useState(() => formatLocalISODate(new Date()));
  const [from, setFrom] = useState(() => dateParam(searchParams, "from", `${today.slice(0, 4)}-01-01`));
  const [to, setTo] = useState(() => dateParam(searchParams, "to", today));
  const [asOf, setAsOf] = useState(() => dateParam(searchParams, "asOf", today));
  const [requestAttempt, setRequestAttempt] = useState(0);
  const [searchDraft, setSearchDraft] = useState(() => (searchParams.get("qDraft") ?? searchParams.get("q") ?? "").slice(0, SEARCH_MAX_LENGTH));
  const [search, setSearch] = useState(() => searchParams.get("q")?.trim().slice(0, SEARCH_MAX_LENGTH) ?? "");
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsStatusRef = useRef<HTMLDivElement>(null);
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null);
  const pageRequest = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);
  const updateSearchParams = (changes: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace: true });
  };
  const rangeDays = Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const validRequest = isValidISODate(from) && isValidISODate(to) && isValidISODate(asOf) &&
    from <= to && to <= today && asOf <= today;
  const requestKey = validRequest ? JSON.stringify([from, to, asOf, search, requestAttempt]) : "";
  const [requestState, setRequestState] = useState<TimelineRequestState | null>(null);
  const currentState = requestState?.key === requestKey ? requestState : null;
  const timeline = currentState?.result ?? null;
  const error = validRequest ? currentState?.error ?? "" : "Choisissez une plage de dates et une date de connaissance valides.";
  const loading = validRequest && !currentState;
  const loadedCount = timeline?.events.length ?? 0;
  const plural = loadedCount === 1 ? "" : "s";
  let resultsStatus = "Aucun événement pour ces dates.";
  if (currentState?.loadingMore) resultsStatus = search ? "Recherche en cours…" : "Chargement de la suite…";
  else if (loadedCount > 0) {
    resultsStatus = `${loadedCount.toLocaleString("fr-FR")} ${search ? `résultat${plural}` : `événement${plural}`} affiché${plural}.`;
  } else if (search) {
    resultsStatus = timeline?.nextCursor ? "Aucun résultat dans la partie parcourue." : "Aucun événement ne correspond à cette recherche.";
  }
  const grouped = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const event of timeline?.events ?? []) {
      const key = dayKey(event.effectiveAt);
      const group = groups.get(key);
      if (group) group.push(event);
      else groups.set(key, [event]);
    }
    return [...groups.entries()];
  }, [timeline]);

  useEffect(() => watchTimelineToday(setToday), []);

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    getTimeline(from, to, asOf, search, controller.signal).then((result) => {
      if (!controller.signal.aborted) setRequestState({ key: requestKey, result });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setRequestState({ key: requestKey,
          error: cause instanceof Error ? cause.message : "La chronologie est indisponible." });
      }
    });
    return () => {
      controller.abort();
      pageRequest.current?.abort();
      pageRequest.current = null;
    };
  }, [asOf, from, requestKey, search, to]);

  useEffect(() => {
    if (loading || !consumeFocusRestoreRequest(retryFocusPending)) return;
    if (currentState?.error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [currentState, loading]);

  const retryHistory = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRequestAttempt((attempt) => attempt + 1);
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchDraft.trim();
    setSearch(query);
    updateSearchParams({ q: query || null, qDraft: query || null });
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    updateSearchParams({ q: null, qDraft: null });
    searchInputRef.current?.focus();
  };

  const showMoreEvents = async () => {
    if (!timeline?.nextCursor || pageRequest.current) return;
    const controller = new AbortController();
    pageRequest.current = controller;
    setRequestState({ key: requestKey, result: timeline, loadingMore: true });
    try {
      const result = await getTimeline(from, to, asOf, search, controller.signal, timeline.nextCursor);
      if (controller.signal.aborted) return;
      if (!result.nextCursor && document.activeElement === loadMoreButtonRef.current) {
        resultsStatusRef.current?.focus({ preventScroll: true });
      }
      const displayed = new Set(timeline.events.map(({ id }) => id));
      const events = [...timeline.events, ...result.events.filter(({ id }) => !displayed.has(id))];
      setRequestState({ key: requestKey, result: { ...result, events } });
    } catch {
      if (!controller.signal.aborted) setRequestState({ key: requestKey, result: timeline, moreError: true });
    } finally {
      if (pageRequest.current === controller) pageRequest.current = null;
    }
  };

  return <div className="workspace-page timeline-page">
    <header className="workspace-header"><div>
      <h1 ref={headingRef} tabIndex={-1}>Historique</h1>
      <p className="workspace-subtitle">Parcourez les pièces, le stock, les recettes, les services et les décisions sans modifier les données actuelles.</p>
    </div></header>

    <section className="timeline-controls" aria-label="Filtres de chronologie">
      <h2>Période et date de connaissance</h2>
      <label htmlFor="timeline-from">Du (service ou effet)
        <input id="timeline-from" type="date" max={today} value={from}
          onChange={(event) => { setFrom(event.target.value); updateSearchParams({ from: event.target.value }); }} />
      </label>
      <label htmlFor="timeline-to">Au
        <input id="timeline-to" type="date" max={today} value={to}
          onChange={(event) => { setTo(event.target.value); updateSearchParams({ to: event.target.value }); }} />
      </label>
      <label htmlFor="timeline-as-of">Connu au
        <input id="timeline-as-of" type="date" max={today} value={asOf}
          onChange={(event) => { setAsOf(event.target.value); updateSearchParams({ asOf: event.target.value }); }} />
      </label>
      <p>{validRequest && `${rangeDays.toLocaleString("fr-FR")} jours affichés. `}La période n’a pas de limite de durée. « Connu au » masque les pièces modifiées après la date choisie.</p>
    </section>

    <section className="timeline-key" aria-label="Origine et niveau de preuve">
      <h2>Origine et niveau de preuve</h2>
      {(Object.entries(labels) as Array<[TimelineProvenance, string]>).map(([key, label]) =>
        <span className={`timeline-badge provenance-${key}`} key={key}>{label}</span>)}
      <p>Une pièce d’archive ne confirme pas une livraison.{!clientPresentation && " Les éléments hors bilan et les hypothèses restent distincts des opérations enregistrées."}</p>
    </section>

    <form className="timeline-search" onSubmit={applySearch}>
      <label htmlFor="timeline-search">Rechercher dans l’historique</label>
      <div className="timeline-search-actions">
        <input ref={searchInputRef} id="timeline-search" type="search" placeholder="Libellé, détail ou précision" value={searchDraft}
          maxLength={SEARCH_MAX_LENGTH} onChange={(event) => { setSearchDraft(event.target.value); updateSearchParams({ qDraft: event.target.value }); }}
          aria-describedby="timeline-search-help" />
        <Button type="submit" variant="outline">Rechercher</Button>
        {(search || searchDraft) && <Button type="button" variant="outline" onClick={clearSearch}>Effacer</Button>}
      </div>
      <p id="timeline-search-help" className="timeline-search-help">La recherche avance par étapes sur toute la période sélectionnée.</p>
    </form>
    <div className="timeline-status" ref={resultsStatusRef} tabIndex={-1}>
      <span role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
        {loading ? "Chargement de l’historique…" : error || (timeline && resultsStatus)}
      </span>
      {currentState?.error && <Button ref={retryButtonRef} type="button" variant="outline" size="sm"
        onClick={retryHistory}>Réessayer</Button>}
    </div>
    {loadedCount > 0 && (
      <div className="timeline-days">
        {grouped.map(([key, events]) => <section className="timeline-day" key={key}>
          <h2>{key === "unknown" ? "Date d’effet inconnue" : displayDate(key)}</h2>
          <ol>
            {events.map((event) => <li key={event.id}>
              <article className="timeline-event">
                <div className="timeline-event-heading">
                  <h3>{event.label}</h3><span className={`timeline-badge provenance-${event.provenance}`}>{labels[event.provenance]}</span>
                </div>
                <p>{clientPresentation && event.kind === "service" ? event.detail.replace(" · origine hors bilan", "") : event.detail}</p>
                <p className="timeline-event-times">
                  <span>Effet : {eventTime(event)}</span>
                  {event.knownAt && <span>Connu le : {displayDate(event.knownAt, true)}</span>}
                  {event.recordedAt && <span>Enregistré le : {displayDate(event.recordedAt, true)}</span>}
                </p>
                {event.qualifier && <p className="timeline-qualifier">{clientPresentation ? presentationQualifier(event.qualifier) : event.qualifier}</p>}
                {event.href && <Link to={event.href} aria-label={`Ouvrir ${event.label} dans l’espace actuel`}>Ouvrir la rubrique actuelle</Link>}
              </article>
            </li>)}
          </ol>
        </section>)}
      </div>
    )}
    {currentState?.moreError && <p role="alert">Impossible de charger la suite de l’historique.</p>}
    {timeline?.nextCursor && <div className="timeline-load-more">
      <Button ref={loadMoreButtonRef} type="button" variant="outline" aria-disabled={currentState?.loadingMore} onClick={showMoreEvents}>
        {currentState?.loadingMore ? "Chargement…" : currentState?.moreError ? "Réessayer" : search ? "Poursuivre la recherche" : "Afficher la suite"}
      </Button>
    </div>}
    <section className="timeline-read-only"><h2>Lecture seule</h2><p>Les liens ouvrent les espaces actuels sans rejouer une décision ni modifier les données. Les documents n’ont pas de journal de versions ; leur première saisie et leurs états antérieurs restent inconnus.</p></section>
  </div>;
}
