import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Button from "../common/Button";
import { getWeeklyServices, saveWeeklyService } from "../../services/serviceCalendarService";
import { serviceSlotLabels, type ServiceSlot, type WeeklyService } from "../../../shared/serviceCalendar";

const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export default function ServiceScheduleSettings({ onPendingChange }: { onPendingChange?: (pending: boolean) => void }) {
  const [entries, setEntries] = useState<WeeklyService[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [slot, setSlot] = useState<ServiceSlot>("lunch");
  const [open, setOpen] = useState(false);
  const [opensAt, setOpensAt] = useState("12:00");
  const [closesAt, setClosesAt] = useState("14:00");
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const titleId = useId();
  const requestId = useRef(0);
  const current = entries.find(entry => entry.weekday === weekday && entry.slot === slot);
  const initialOpensAt = current?.opensAt ?? (slot === "lunch" ? "12:00" : "19:00");
  const initialClosesAt = current?.closesAt ?? (slot === "lunch" ? "14:00" : "22:00");
  const dirty = loaded && (open !== Boolean(current) || (open && (opensAt !== initialOpensAt || closesAt !== initialClosesAt)));
  useEffect(() => { onPendingChange?.(dirty || saving); }, [onPendingChange, dirty, saving]);
  useEffect(() => () => { onPendingChange?.(false); }, [onPendingChange]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setBusy(true); setError("");
    try {
      const result = await getWeeklyServices();
      if (request !== requestId.current) return false;
      setEntries(result); setLoaded(true);
      const selected = result.find(entry => entry.weekday === weekday && entry.slot === slot);
      setOpen(Boolean(selected));
      setOpensAt(selected?.opensAt ?? (slot === "lunch" ? "12:00" : "19:00"));
      setClosesAt(selected?.closesAt ?? (slot === "lunch" ? "14:00" : "22:00"));
      return true;
    } catch (cause) {
      if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Horaires indisponibles.");
      return false;
    } finally { if (request === requestId.current) setBusy(false); }
  }, [weekday, slot]);
  useEffect(() => { void load(); const revision = requestId; return () => { revision.current++; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const select = (nextDay: number, nextSlot: ServiceSlot) => {
    const selected = entries.find((entry) => entry.weekday === nextDay && entry.slot === nextSlot);
    setWeekday(nextDay); setSlot(nextSlot); setOpen(Boolean(selected));
    setOpensAt(selected?.opensAt ?? (nextSlot === "lunch" ? "12:00" : "19:00"));
    setClosesAt(selected?.closesAt ?? (nextSlot === "lunch" ? "14:00" : "22:00"));
    setStatus(""); setError("");
  };
  const cancel = () => {
    setOpen(Boolean(current)); setOpensAt(initialOpensAt); setClosesAt(initialClosesAt);
    setStatus("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setSaving(true); setError(""); setStatus("");
    try {
      const saved = await saveWeeklyService({ weekday, slot, open, opensAt, closesAt,
        expectedRevision: current?.revision ?? 0 });
      setEntries(previous => [...previous.filter(entry => entry.weekday !== weekday || entry.slot !== slot), ...(saved ? [saved] : [])]);
      setStatus("Horaire hebdomadaire enregistré. Les ventes restent à renseigner séparément.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); setSaving(false); }
  };
  return <section className="sales-panel" aria-labelledby={titleId}>
    <h2 id={titleId}>Horaires des services</h2>
    <p>Planifiez midi et soir. Une ouverture prévue ne confirme ni ventes ni couverts observés. Les exceptions datées se renseignent dans Ventes.</p>
    <form className="sales-form" onSubmit={(event) => void submit(event)}>
      <label>Jour<select disabled={busy || dirty || !loaded} value={weekday} onChange={(event) => select(Number(event.target.value), slot)}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
      <label>Service<select disabled={busy || dirty || !loaded} value={slot} onChange={(event) => select(weekday, event.target.value as ServiceSlot)}>{Object.entries(serviceSlotLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Ouverture prévue<select disabled={busy || !loaded} value={open ? "open" : "closed"} onChange={(event) => setOpen(event.target.value === "open")}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>
      {open && <><label>Début<input disabled={busy || !loaded} type="time" required value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /></label>
        <label>Fin<input disabled={busy || !loaded} type="time" required min={opensAt} value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label></>}
      <Button type="submit" disabled={busy || !loaded}>{busy ? "Chargement…" : "Enregistrer l’horaire"}</Button>
      {dirty && <Button type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button>}
      {dirty && <p>Enregistrez ou annulez les modifications avant de changer de jour ou de service.</p>}
    </form>
    {error && <p role="alert">{error} <button type="button" disabled={busy || dirty} onClick={() => void load()}>Réessayer</button></p>}{status && <p role="status">{status}</p>}
    <ul>{entries.map((entry) => <li key={`${entry.weekday}:${entry.slot}`}>{weekdays[entry.weekday]} · {serviceSlotLabels[entry.slot]} : {entry.opensAt}–{entry.closesAt}</li>)}</ul>
    {loaded && !busy && !entries.length && <p>Aucun horaire renseigné. Aucune ouverture n’est supposée.</p>}
  </section>;
}
