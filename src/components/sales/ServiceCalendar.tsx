import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Button from "../common/Button";
import { getServiceDays, saveServiceDay, type ServiceCoverage, type ServiceDay, type ServiceStatus } from "../../services/salesService";
import { describeServiceCoverage } from "../../features/sales/salesPresentation";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

const statusLabels: Record<ServiceStatus, string> = { open: "Ouvert", closed: "Fermé" };
const sourceLabels: Record<ServiceDay["source"], string> = { recorded: "enregistrée", demo_simulation: "hors bilan", mixed: "mixte" };
const dateRange = (from: string, to: string) => {
  const days: string[] = [];
  for (let value = Date.parse(from); value <= Date.parse(to); value += 86_400_000) days.push(new Date(value).toISOString().slice(0, 10));
  return days;
};

export default function ServiceCalendar({ from, to, today, onChanged }: {
  from: string; to: string; today: string; onChanged: () => Promise<void>;
}) {
  const [days, setDays] = useState<ServiceDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(to);
  const [status, setStatus] = useState<ServiceStatus>("open");
  const [coverage, setCoverage] = useState<ServiceCoverage>("partial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const restoreSubmitFocus = useRef(false);
  const selected = days.find((day) => day.serviceDate === selectedDate) ?? null;
  const calendarDates = useMemo(() => dateRange(from, to), [from, to]);

  const load = useCallback(async (): Promise<string | null> => {
    setLoading(true); setError("");
    try { setDays(await getServiceDays(from, to)); return null; }
    catch (cause) {
      const failure = cause instanceof Error ? cause.message : "Calendrier indisponible.";
      setError(failure);
      return failure;
    }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const selectedDay = days.find((day) => day.serviceDate === selectedDate);
    if (!selectedDay) { setStatus("open"); setCoverage("partial"); return; }
    setStatus(selectedDay.status); setCoverage(selectedDay.coverage);
  }, [selectedDate, days]);
  useEffect(() => { setSelectedDate(to); }, [from, to]);
  useEffect(() => {
    if (saving || !restoreSubmitFocus.current) return;
    restoreSubmitFocus.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButton.current?.focus();
    else saveButton.current?.focus();
  }, [error, saving]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); restoreSubmitFocus.current = document.activeElement === saveButton.current;
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await saveServiceDay({ serviceDate: selectedDate, revision: selected?.revision ?? 0, status, coverage });
      setDays((current) => [...current.filter((day) => day.serviceDate !== updated.serviceDate), updated].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)));
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
      <label>Date de service<input type="date" required min={from} max={to < today ? to : today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
      <label>État du restaurant<select value={status} onChange={(event) => { const next = event.target.value as ServiceStatus; setStatus(next); if (next === "closed") setCoverage("complete"); }}>
        <option value="open">Ouvert ce jour-là</option><option value="closed">Fermé ce jour-là</option>
      </select></label>
      <label>Couverture des ventes<select value={coverage} disabled={status === "closed"} onChange={(event) => setCoverage(event.target.value as ServiceCoverage)}>
        <option value="complete">Complète — omissions = zéro observé</option>
        <option value="partial">Partielle — revue incomplète</option>
        <option value="missing">Manquante — données inconnues</option>
      </select></label>
      <Button ref={saveButton} type="submit" disabled={saving || loading || !!error || !calendarDates.includes(selectedDate)}>{saving ? "Enregistrement…" : "Enregistrer l’état du service"}</Button>
    </form>
    {error && <div role="alert"><p>{error}</p><Button ref={retryButton} type="button" variant="outline" onClick={retryLoad} disabled={loading || saving}>Réessayer</Button></div>}{message && <p role="status">{message}</p>}
    <p className="sales-table-hint" id="service-calendar-table-scroll-hint">Sur petit écran, faites défiler le tableau horizontalement. Au clavier, placez le focus sur le tableau puis utilisez ← et →.</p>
    <div className="sales-table-wrap" role="region" aria-label="Jours de service sur la période" aria-describedby="service-calendar-table-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th>Date</th><th>État du restaurant</th><th>Couverture</th><th>Ventes enregistrées</th></tr></thead>
        <tbody>{calendarDates.slice().reverse().map((date) => {
          const day = days.find((item) => item.serviceDate === date);
          return <tr key={date} aria-current={selectedDate === date ? "date" : undefined}>
            <td>{date}</td><td>{day ? statusLabels[day.status as ServiceStatus] : "Non renseigné"}</td>
            <td>{day ? `${describeServiceCoverage(day.coverage)}${day.source === "recorded" ? "" : ` · provenance ${sourceLabels[day.source]}`}` : "Manquante"}</td>
            <td>{!day ? "Inconnu" : day.status === "closed" ? "Pas de service" : day.coverage === "complete" && day.salesCount === 0 ? "0 observé" : `${day.salesCount} ligne(s)`}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {loading && <p role="status">Chargement du calendrier…</p>}
  </section>;
}
