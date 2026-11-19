import { useClientPresentation } from "../../features/members/workspaceContext";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../config/api";
import Button from "../common/Button";
import { useSalesRead } from "../../features/sales/useSalesReads";
import { displayServiceNote } from "../../features/services/serviceNotePresentation";
import { getServiceCalendar, saveCalendarService } from "../../services/serviceCalendarService";
import { serviceSlotLabels, type CalendarService, type ServiceSlot, type SalesCoverage } from "../../../shared/serviceCalendar";

type ServiceFields = Pick<CalendarService, "plannedOpen" | "coverage" | "actualCovers" | "note">;

export default function DatedServices({ today, refreshToken }: { today: string; refreshToken: number }) {
  const clientPresentation = useClientPresentation();
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<ServiceSlot>("lunch");
  const read = useCallback(() => date ? getServiceCalendar(date, date) : Promise.resolve([]), [date]);
  const { data: services = [], loading, error: loadError, reload } = useSalesRead(read, refreshToken);
  const [draft, setDraft] = useState<{ base: CalendarService; changes: Partial<ServiceFields> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; conflictRevision?: number }>();
  const [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = services.find((service) => service.serviceDate === date && service.slot === slot);
  const needsReview = !!draft && !!selected && draft.base.revision !== selected.revision;
  const needsReload = saveError?.conflictRevision !== undefined && saveError.conflictRevision === selected?.revision;
  const changes = needsReview ? undefined : draft?.changes;
  const base = selected ?? draft?.base;
  const values = base && { ...base, ...changes };
  const unavailable = loading || saving || !!loadError || !selected;
  const disabled = unavailable || needsReview || needsReload;
  const select = (nextDate: string, nextSlot: ServiceSlot) => {
    setDate(nextDate); setSlot(nextSlot); setDraft(null); setSaveError(undefined); setStatus("");
  };
  const edit = (update: Partial<ServiceFields>) => {
    if (!selected) return;
    setDraft({ base: selected, changes: { ...changes, ...update } });
    setSaveError(undefined); setStatus("");
  };
  const review = (keepChanges: boolean) => {
    if (!selected || !draft) return;
    heading.current?.focus();
    setDraft(keepChanges ? { base: selected, changes: draft.changes } : null);
    setSaveError(undefined);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values || disabled) return;
    const { serviceDate, slot, plannedOpen, coverage, actualCovers, note, revision } = values;
    setSaving(true); setSaveError(undefined); setStatus("");
    try {
      await saveCalendarService({ serviceDate, slot, plannedOpen, coverage, actualCovers, note, expectedRevision: revision });
      setDraft(null); reload(); setStatus("Service enregistré. La planification et les observations restent distinctes.");
    } catch (cause) {
      setSaveError({ message: cause instanceof Error ? cause.message : "Enregistrement impossible.",
        ...(cause instanceof ApiError && cause.details.code === "REVISION_CONFLICT" ? { conflictRevision: revision } : {}),
      });
    }
    finally { setSaving(false); }
  };
  return <section className="sales-panel dated-services" aria-labelledby="dated-service-title">
    <h2 id="dated-service-title" ref={heading} tabIndex={-1}>Services midi et soir</h2>
    <p><Link to="/settings">Renseigner les horaires hebdomadaires</Link>. Ici, déclarez une fermeture exceptionnelle ou revoyez les ventes du service. Les anciennes ventes restent non ventilées tant que vous ne les attribuez pas.</p>
    <form className="sales-form dated-service-form" onSubmit={(event) => void submit(event)}>
      <label>Date<input type="date" required disabled={saving} value={date} onChange={(event) => select(event.target.value, slot)} /></label>
      <label>Service<select disabled={saving} value={slot} onChange={(event) => select(date, event.target.value as ServiceSlot)}><option value="lunch">Midi</option><option value="dinner">Soir</option></select></label>
      <label>Ouverture prévue<select disabled={disabled} value={values?.plannedOpen ? "open" : "closed"} onChange={(event) => edit({ plannedOpen: event.target.value === "open" })}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>
      <label>{selected?.simulated ? (clientPresentation ? "Couverture des ventes" : "Couverture simulée") : "Ventes revues"}<select disabled={disabled || date > today} value={values?.coverage ?? "missing"} onChange={(event) => edit({ coverage: event.target.value as SalesCoverage })}><option value="missing">Non renseignées</option><option value="partial">Partielles</option><option value="complete">{selected?.simulated ? "Complètes" : "Complètes, après revue"}</option></select></label>
      <label>{selected?.simulated ? (clientPresentation ? "Couverts (facultatif)" : "Couverts simulés") : "Couverts observés (facultatif)"}<input type="number" min="0" max="100000" step="1" disabled={disabled || date > today} value={values?.actualCovers ?? ""} onChange={(event) => edit({ actualCovers: event.target.value === "" ? null : Number(event.target.value) })} /></label>
      <div className="dated-service-note"><label>Motif / contexte, sans donnée personnelle<input maxLength={1000} disabled={disabled} value={changes?.note ?? displayServiceNote(base?.note ?? "", clientPresentation)} onChange={(event) => edit({ note: event.target.value })} /></label></div>
      <div className="dated-service-submit"><Button disabled={disabled} type="submit">{saving ? "Enregistrement…" : loading ? "Chargement…" : "Enregistrer le service"}</Button></div>
    </form>
    {(loadError || needsReload) && <p role="alert">{loadError || saveError?.message} <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => { heading.current?.focus(); reload(); }}>Recharger le service</Button></p>}
    {saveError && saveError.conflictRevision === undefined && <p role="alert">{saveError.message}</p>}
    {needsReview && <div>
      <p role="alert">Le service a changé. Le formulaire affiche la version enregistrée. Vous pouvez reprendre votre saisie et la vérifier avant d’enregistrer.</p>
      <div className="sales-actions">
        <Button type="button" disabled={unavailable} onClick={() => review(true)}>Reprendre ma saisie</Button>
        <Button type="button" variant="outline" disabled={unavailable} onClick={() => review(false)}>Garder la version enregistrée</Button>
      </div>
    </div>}
    {status && <p role="status">{status}</p>}
    <ul>{services.map((service) => <li key={service.slot}><strong>{serviceSlotLabels[service.slot]}</strong> · {service.plannedOpen ? "ouverture prévue" : "fermeture prévue"}
      {service.opensAt && ` ${service.opensAt}–${service.closesAt}`} · ventes {service.coverage === "complete" ? "complètes" : service.coverage === "partial" ? "partielles" : "non renseignées"} · {service.simulated ? `${service.simulatedSoldQuantity ?? 0} unités ${clientPresentation ? "attribuées" : "simulées"}` : `${service.soldQuantity} unités attribuées`}.
      {service.actualCovers !== null && ` ${service.actualCovers} couverts${service.simulated ? (clientPresentation ? "" : " simulés") : " observés"}.`}
      {service.unallocatedQuantity > 0 && ` ${service.unallocatedQuantity} unités de la journée restent non ventilées.`}
      {service.allocationNeedsReview && " Une vente a été corrigée : revoyez sa ventilation."}
      {!service.simulated && service.excludedSimulationQuantity > 0 && ` ${service.excludedSimulationQuantity} unités${clientPresentation ? "" : " hors bilan"} exclues de ces observations.`}
    </li>)}</ul>
  </section>;
}
