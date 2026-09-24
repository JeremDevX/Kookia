import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Button from "../common/Button";
import { getServiceDays, saveServiceDay, type ServiceCoverage, type ServiceDay, type ServiceStatus } from "../../services/salesService";

const coverageLabels: Record<ServiceCoverage, string> = {
  complete: "Complète", partial: "Partielle", missing: "Manquante",
};
const statusLabels: Record<ServiceStatus, string> = { open: "Ouvert", closed: "Fermé" };
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
  const selected = days.find((day) => day.serviceDate === selectedDate) ?? null;
  const calendarDates = useMemo(() => dateRange(from, to), [from, to]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDays(await getServiceDays(from, to)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Calendrier indisponible."); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const selectedDay = days.find((day) => day.serviceDate === selectedDate);
    if (!selectedDay) { setStatus("open"); setCoverage("partial"); return; }
    setStatus(selectedDay.status); setCoverage(selectedDay.coverage);
  }, [selectedDate, days]);
  useEffect(() => { setSelectedDate(to); }, [from, to]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const updated = await saveServiceDay({ serviceDate: selectedDate, revision: selected?.revision ?? 0, status, coverage });
      setDays((current) => [...current.filter((day) => day.serviceDate !== updated.serviceDate), updated].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)));
      setMessage(`État du ${selectedDate} enregistré. Attribution conservée.`);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "État du service non enregistré.");
      await load();
    } finally { setSaving(false); }
  };

  return <section className="sales-panel" aria-labelledby="service-calendar-title">
    <h2 id="service-calendar-title">Calendrier des services</h2>
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
      <Button type="submit" disabled={saving || loading || !calendarDates.includes(selectedDate)}>{saving ? "Enregistrement…" : "Enregistrer l’état du service"}</Button>
    </form>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="sales-table-wrap" role="region" aria-label="Jours de service sur la période" tabIndex={0}>
      <table className="sales-table"><thead><tr><th>Date</th><th>État du restaurant</th><th>Couverture</th><th>Ventes enregistrées</th></tr></thead>
        <tbody>{calendarDates.slice().reverse().map((date) => {
          const day = days.find((item) => item.serviceDate === date);
          return <tr key={date} aria-current={selectedDate === date ? "date" : undefined}>
            <td>{date}</td><td>{day ? statusLabels[day.status as ServiceStatus] : "Non renseigné"}</td>
            <td>{day ? coverageLabels[day.coverage as ServiceCoverage] : "Manquante"}</td>
            <td>{!day ? "Inconnu" : day.status === "closed" ? "Pas de service" : day.coverage === "complete" && day.salesCount === 0 ? "0 observé" : `${day.salesCount} ligne(s)`}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {loading && <p role="status">Chargement du calendrier…</p>}
  </section>;
}
