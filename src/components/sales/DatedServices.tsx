import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getServiceCalendar, saveCalendarService } from "../../services/serviceCalendarService";
import { serviceSlotLabels, type CalendarService, type ServiceSlot, type SalesCoverage } from "../../../shared/serviceCalendar";

export default function DatedServices({ today, refreshToken }: { today: string; refreshToken: number }) {
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<ServiceSlot>("lunch");
  const [services, setServices] = useState<CalendarService[]>([]);
  const [plannedOpen, setPlannedOpen] = useState(false);
  const [coverage, setCoverage] = useState<SalesCoverage>("missing");
  const [covers, setCovers] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const rows = await getServiceCalendar(date, date); setServices(rows);
      const current = rows.find((entry) => entry.slot === slot);
      setPlannedOpen(current?.plannedOpen ?? false); setCoverage(current?.coverage ?? "missing");
      setCovers(current?.actualCovers === null || current?.actualCovers === undefined ? "" : String(current.actualCovers)); setNote(current?.note ?? "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Services indisponibles."); }
    finally { setBusy(false); }
  }, [date, slot]);
  useEffect(() => { void load(); }, [load, refreshToken]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setStatus("");
    try {
      await saveCalendarService({ serviceDate: date, slot, plannedOpen, coverage,
        actualCovers: covers === "" ? null : Number(covers), note,
        expectedRevision: services.find((entry) => entry.slot === slot)?.revision ?? 0 });
      await load(); setStatus("Service enregistré. La planification et les observations restent distinctes.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  return <section className="sales-panel" aria-labelledby="dated-service-title">
    <h2 id="dated-service-title">Services midi et soir</h2>
    <p><Link to="/settings">Renseigner les horaires hebdomadaires</Link>. Ici, déclarez une fermeture exceptionnelle ou revoyez les ventes du service. Les anciennes ventes restent non ventilées tant que vous ne les attribuez pas.</p>
    <form className="sales-form" onSubmit={(event) => void submit(event)}>
      <label>Date<input type="date" required value={date} onChange={(event) => { setDate(event.target.value); setStatus(""); }} /></label>
      <label>Service<select value={slot} onChange={(event) => { setSlot(event.target.value as ServiceSlot); setStatus(""); }}><option value="lunch">Midi</option><option value="dinner">Soir</option></select></label>
      <label>Ouverture prévue<select disabled={busy} value={plannedOpen ? "open" : "closed"} onChange={(event) => setPlannedOpen(event.target.value === "open")}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>
      <label>Ventes revues<select disabled={busy || date > today} value={coverage} onChange={(event) => setCoverage(event.target.value as SalesCoverage)}><option value="missing">Non renseignées</option><option value="partial">Partielles</option><option value="complete">Complètes, après revue</option></select></label>
      <label>Couverts observés (facultatif)<input type="number" min="0" max="100000" step="1" disabled={busy || date > today} value={covers} onChange={(event) => setCovers(event.target.value)} /></label>
      <label>Motif / contexte, sans donnée personnelle<input maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <Button disabled={busy || Boolean(error)} type="submit">{busy ? "Chargement…" : "Enregistrer le service"}</Button>
    </form>
    {error && <p role="alert">{error} <button type="button" onClick={() => void load()}>Réessayer</button></p>}{status && <p role="status">{status}</p>}
    <ul>{services.map((service) => <li key={service.slot}><strong>{serviceSlotLabels[service.slot]}</strong> · {service.plannedOpen ? "ouverture prévue" : "fermeture prévue"}
      {service.opensAt && ` ${service.opensAt}–${service.closesAt}`} · ventes {service.coverage === "complete" ? "complètes" : service.coverage === "partial" ? "partielles" : "non renseignées"} · {service.soldQuantity} unités attribuées.
      {service.actualCovers !== null && ` ${service.actualCovers} couverts observés.`}
      {service.unallocatedQuantity > 0 && ` ${service.unallocatedQuantity} unités de la journée restent non ventilées.`}
      {service.allocationNeedsReview && " Une vente a été corrigée : revoyez sa ventilation."}
      {service.excludedSimulationQuantity > 0 && ` ${service.excludedSimulationQuantity} unités hors bilan exclues de ces observations.`}
    </li>)}</ul>
  </section>;
}
