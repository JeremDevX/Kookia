import { useClientPresentation } from "../../features/members/workspaceContext";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import Button from "../common/Button";
import { getServiceDays, saveServiceDay, type ServiceCoverage, type ServiceDay, type ServiceStatus } from "../../services/salesService";
import { describeServiceCoverage } from "../../features/sales/salesPresentation";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

const statusLabels: Record<ServiceStatus, string> = { open: "Ouvert", closed: "Fermé" };
const sourceLabels: Record<ServiceDay["source"], string> = { recorded: "enregistrée", demo_simulation: "hors bilan", mixed: "mixte" };
const dateRange = (from: string, to: string) => {
  const days: string[] = [];
  const start = Date.parse(from);
  for (let value = Date.parse(to); value >= start; value -= 86_400_000) days.push(new Date(value).toISOString().slice(0, 10));
  return days;
};

type ServiceCalendarProps = {
  from: string; to: string; today: string; onChanged: () => Promise<void>;
};

export default function ServiceCalendar(props: ServiceCalendarProps) {
  const [hasOpened, setHasOpened] = useState(false);
  return <details className="sales-disclosure" onToggle={(event) => { if (event.currentTarget.open) setHasOpened(true); }}>
    <summary>Couverture quotidienne historique (non ventilée)</summary>
    {hasOpened && <ServiceCalendarPeriod key={`${props.from}:${props.to}`} {...props} />}
  </details>;
}

function ServiceCalendarPeriod({ from, to, today, onChanged }: ServiceCalendarProps) {
  const clientPresentation = useClientPresentation();
  const [days, setDays] = useState<ServiceDay[] | null>(null);
  const [selectedDate, setSelectedDate] = useState(to);
  const [draft, setDraft] = useState<Pick<ServiceDay, "status" | "coverage"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const restoreSubmitFocus = useRef(false);
  const hasDays = days !== null;
  const daysByDate = useMemo(() => new Map(days?.map((day) => [day.serviceDate, day])), [days]);
  const calendarDates = useMemo(() => hasDays ? dateRange(from, to) : [], [from, to, hasDays]);
  const selected = daysByDate.get(selectedDate);
  const { status, coverage } = draft ?? selected ?? { status: "open", coverage: "partial" };
  const blocked = saving || loading || !!error || !hasDays;
  const canSave = !blocked && selectedDate >= from && selectedDate <= to && selectedDate <= today;

  const load = useCallback(async (isActive: () => boolean = () => true): Promise<string | null> => {
    setLoading(true); setError("");
    try {
      const result = await getServiceDays(from, to);
      if (isActive()) { setDays(result); setDraft(null); }
      return null;
    } catch (cause) {
      const failure = cause instanceof Error ? cause.message : "Calendrier indisponible.";
      if (isActive()) { setDays(null); setError(failure); }
      return failure;
    }
    finally { if (isActive()) setLoading(false); }
  }, [from, to]);
  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (saving || !consumeFocusRestoreRequest(restoreSubmitFocus)) return;
    if (error) retryButton.current?.focus();
    else saveButton.current?.focus();
  }, [error, saving]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    restoreSubmitFocus.current = document.activeElement === saveButton.current;
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await saveServiceDay({ serviceDate: selectedDate, revision: selected?.revision ?? 0, status, coverage });
      setDays((current) => [...(current ?? []).filter((day) => day.serviceDate !== updated.serviceDate), updated]);
      setDraft(null);
      setMessage(`État du ${selectedDate} enregistré. Attribution conservée.`);
      await onChanged();
    } catch (cause) {
      const failure = cause instanceof Error ? cause.message : "État du service non enregistré.";
      const reloadFailure = await load();
      setError(reloadFailure
        ? `${failure} Le rechargement du calendrier a également échoué : ${reloadFailure}`
        : `${failure} Le calendrier a été rechargé ; vos changements non enregistrés ont été abandonnés. Vérifiez l’état avant de réessayer.`);
    } finally { setSaving(false); }
  };
  const retryLoad = () => {
    setMessage("");
    void load();
    requestAnimationFrame(() => heading.current?.focus());
  };

  return <section className="sales-panel" aria-labelledby="service-calendar-title">
    <h2 id="service-calendar-title" ref={heading} tabIndex={-1}>Calendrier des services</h2>
    <p>« Ouvert + complet » signifie que les ventes du service ont été revues : un article sans ligne vaut alors zéro observé. Partiel, manquant ou non renseigné reste inconnu. Un jour fermé et confirmé complet n’est pas un service.</p>
    <form className="sales-form" onSubmit={(event) => void submit(event)}>
      <label>Date de service<input type="date" required min={from} max={to < today ? to : today} value={selectedDate} disabled={blocked} onChange={(event) => { setSelectedDate(event.target.value); setDraft(null); }} /></label>
      <label>État du restaurant<select value={status} disabled={blocked} onChange={(event) => {
        const next = event.target.value as ServiceStatus;
        setDraft({ status: next, coverage: next === "closed" ? "complete" : coverage });
      }}>
        <option value="open">Ouvert ce jour-là</option><option value="closed">Fermé ce jour-là</option>
      </select></label>
      <label>Couverture des ventes<select value={coverage} disabled={blocked || status === "closed"} onChange={(event) => setDraft({ status, coverage: event.target.value as ServiceCoverage })}>
        <option value="complete">Complète — omissions = zéro observé</option>
        <option value="partial">Partielle — revue incomplète</option>
        <option value="missing">Manquante — données inconnues</option>
      </select></label>
      <Button ref={saveButton} type="submit" disabled={!canSave}>{saving ? "Enregistrement…" : "Enregistrer l’état du service"}</Button>
    </form>
    {error && <div role="alert"><p>{error}</p><Button ref={retryButton} type="button" variant="outline" onClick={retryLoad} disabled={loading || saving}>Réessayer</Button></div>}{message && <p role="status">{message}</p>}
    {loading && <p role="status">Chargement du calendrier…</p>}
    {!loading && hasDays && <><p className="sales-table-hint" id="service-calendar-table-scroll-hint">Sur petit écran, faites défiler le tableau horizontalement. Au clavier, placez le focus sur le tableau puis utilisez ← et →.</p>
    <div className="sales-table-wrap" role="region" aria-label="Jours de service sur la période" aria-describedby="service-calendar-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Date</th><th>État du restaurant</th><th>Couverture</th><th>Ventes enregistrées</th></tr></thead>
        <tbody>{calendarDates.map((date) => {
          const day = daysByDate.get(date);
          return <tr key={date} aria-current={selectedDate === date ? "date" : undefined}>
            <td>{date}</td><td>{day ? statusLabels[day.status] : "Non renseigné"}</td>
            <td>{day ? `${describeServiceCoverage(day.coverage)}${(clientPresentation || day.source === "recorded") ? "" : ` · provenance ${sourceLabels[day.source]}`}` : "Manquante"}</td>
            <td>{!day ? "Inconnu" : day.status === "closed" ? "Pas de service" : day.coverage === "complete" && day.salesCount === 0 ? "0 observé" : `${day.salesCount} ligne(s)`}</td>
          </tr>;
        })}</tbody>
      </table>
    </div></>}
  </section>;
}
