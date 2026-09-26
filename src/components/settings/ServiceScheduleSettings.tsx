import { useEffect, useState, type FormEvent } from "react";
import Button from "../common/Button";
import { getWeeklyServices, saveWeeklyService } from "../../services/serviceCalendarService";
import { serviceSlotLabels, type ServiceSlot, type WeeklyService } from "../../../shared/serviceCalendar";

const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export default function ServiceScheduleSettings() {
  const [entries, setEntries] = useState<WeeklyService[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [slot, setSlot] = useState<ServiceSlot>("lunch");
  const [open, setOpen] = useState(true);
  const [opensAt, setOpensAt] = useState("12:00");
  const [closesAt, setClosesAt] = useState("14:00");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const load = async () => {
    setBusy(true); setError("");
    try { setEntries(await getWeeklyServices()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Horaires indisponibles."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const select = (nextDay: number, nextSlot: ServiceSlot) => {
    const current = entries.find((entry) => entry.weekday === nextDay && entry.slot === nextSlot);
    setWeekday(nextDay); setSlot(nextSlot); setOpen(Boolean(current));
    setOpensAt(current?.opensAt ?? (nextSlot === "lunch" ? "12:00" : "19:00"));
    setClosesAt(current?.closesAt ?? (nextSlot === "lunch" ? "14:00" : "22:00"));
    setStatus("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setStatus("");
    try {
      await saveWeeklyService({ weekday, slot, open, opensAt, closesAt,
        expectedRevision: entries.find((entry) => entry.weekday === weekday && entry.slot === slot)?.revision ?? 0 });
      await load(); setStatus("Horaire hebdomadaire enregistré. Les ventes restent à renseigner séparément.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  return <section className="sales-panel" aria-labelledby="schedule-title">
    <h2 id="schedule-title">Horaires des services</h2>
    <p>Planifiez midi et soir. Une ouverture prévue ne confirme ni ventes ni couverts observés. Les exceptions datées se renseignent dans Ventes.</p>
    <form className="sales-form" onSubmit={(event) => void submit(event)}>
      <label>Jour<select value={weekday} onChange={(event) => select(Number(event.target.value), slot)}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
      <label>Service<select value={slot} onChange={(event) => select(weekday, event.target.value as ServiceSlot)}>{Object.entries(serviceSlotLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Ouverture prévue<select value={open ? "open" : "closed"} onChange={(event) => setOpen(event.target.value === "open")}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>
      {open && <><label>Début<input type="time" required value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /></label>
        <label>Fin<input type="time" required min={opensAt} value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label></>}
      <Button type="submit" disabled={busy}>{busy ? "Chargement…" : "Enregistrer l’horaire"}</Button>
    </form>
    {error && <p role="alert">{error} <button type="button" onClick={() => void load()}>Réessayer</button></p>}{status && <p role="status">{status}</p>}
    <ul>{entries.map((entry) => <li key={`${entry.weekday}:${entry.slot}`}>{weekdays[entry.weekday]} · {serviceSlotLabels[entry.slot]} : {entry.opensAt}–{entry.closesAt}</li>)}</ul>
    {!busy && !entries.length && <p>Aucun horaire renseigné. Aucune ouverture n’est supposée.</p>}
  </section>;
}
