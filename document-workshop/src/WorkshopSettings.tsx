import { useRef, useState, type SubmitEvent } from "react";
import { ArrowUpRight, Check, PencilLine } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import { ApiError } from "../../src/config/api";
import { formatParisDate } from "../../shared/parisDate";
import { saveWorkshopSettings, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate, offsetDate } from "./calendar";
import { serviceLabel, weekdays } from "./workshopPresentation";

type SettingField = "covers" | "incidentEvery";
type Draft = Partial<Record<SettingField, string>> & { revision: number };

export default function WorkshopSettings({ control, onSaved, onAccessError, onRefresh }: {
  control: WorkshopControl;
  onSaved: (settings: WorkshopControl["settings"]) => void;
  onAccessError: (cause: unknown) => void;
  onRefresh: () => void;
}) {
  const { restaurant, canManage, settings } = control;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveState, setSaveState] = useState<"busy" | "saved" | "error" | "conflict" | "idle">("idle");
  const coversInput = useRef<HTMLInputElement>(null);
  const effectiveFrom = settings.effectiveFrom;
  const today = formatParisDate();
  const nextDate = offsetDate(today, 1);
  const live = { covers: String(settings.covers), incidentEvery: String(settings.incidentEvery), revision: settings.revision };
  const fields = { ...live, ...draft };
  const changed = Number(fields.covers) !== settings.covers || Number(fields.incidentEvery) !== settings.incidentEvery;
  const outdated = fields.revision !== settings.revision;
  const busy = saveState === "busy";
  const conflict = saveState === "conflict" || outdated;
  const update = (field: SettingField, value: string) => {
    setDraft(current => {
      const next = { ...current, revision: current?.revision ?? settings.revision, [field]: value };
      if (Number(value) === settings[field]) delete next[field];
      return next.covers === undefined && next.incidentEvery === undefined ? null : next;
    });
    if (saveState === "saved" || saveState === "error") setSaveState("idle");
  };
  const reconcile = (keepDraft: boolean) => {
    setDraft(keepDraft && draft ? { ...draft, revision: settings.revision } : null);
    setSaveState("idle");
    coversInput.current?.focus();
  };
  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || busy || conflict || !changed) return;
    setSaveState("busy");
    try {
      const result = await saveWorkshopSettings({
        covers: Number(fields.covers),
        incidentEvery: Number(fields.incidentEvery),
        expectedRevision: fields.revision,
      });
      setDraft(null);
      onSaved(result);
      setSaveState("saved");
    } catch (cause) {
      if (workshopAccessError(cause)) {
        setSaveState("idle");
        onAccessError(cause);
      } else if (cause instanceof ApiError && cause.details.code === "WORKSHOP_SETTINGS_CHANGED") {
        setSaveState("conflict");
        onRefresh();
      } else {
        setSaveState("error");
      }
    }
  };

  return <section className="panel workshop-settings" aria-labelledby="workshop-settings">
    <div className="workshop-heading">
      <h2 id="workshop-settings">Réglages</h2>
    </div>
    <details className="workshop-details">
      <summary><span>Établissement dans Kookia</span></summary>
      <dl className="workshop-facts">
        <div><dt>Commune</dt><dd>{restaurant.city || "Non renseignée"}</dd></div>
        <div><dt>Terrasse</dt><dd>{restaurant.hasTerrace === null ? "Non renseignée" : restaurant.hasTerrace ? "Oui" : "Non"}</dd></div>
      </dl>
      <p className="workshop-muted settings-hours">Horaires habituels</p>
      {restaurant.weeklyServices.length ? <ul className="workshop-rows" role="list">
        {[...restaurant.weeklyServices].sort((a, b) => (a.weekday + 6) % 7 - (b.weekday + 6) % 7).map(({ weekday, slot, opensAt, closesAt }) =>
          <li key={`${weekday}:${slot}`}><strong>{weekdays[weekday]} · {serviceLabel[slot]}</strong><span>{opensAt}–{closesAt}</span></li>)}
      </ul> : <p className="hint">Aucun horaire habituel renseigné.</p>}
      {canManage && <a className="workshop-link" href="/settings">Modifier dans Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>}
    </details>
    <details className="workshop-details">
      <summary><span>Simulation</span>{canManage && <PencilLine className="control-edit-icon" size={16} aria-hidden="true" />}</summary>
      {canManage ? <form onSubmit={save}>
        <fieldset disabled={busy} aria-describedby="workshop-effective-setting">
          <div className="workshop-fields">
            <label>Couverts par jour ouvert<input ref={coversInput} name="covers" type="number" min={5} max={200} required value={fields.covers} onChange={event => update("covers", event.currentTarget.value)} /></label>
            <label>Un imprévu tous les… jours<input name="incidentEvery" type="number" min={1} max={90} required value={fields.incidentEvery} onChange={event => update("incidentEvery", event.currentTarget.value)} /></label>
          </div>
        </fieldset>
        <p className="hint" id="workshop-effective-setting">Les modifications s’appliquent le <time dateTime={nextDate}>{displayDate(nextDate)}</time>.</p>
        {conflict && <div className="control-setting-conflict">
          <p role="alert"><strong>Les réglages ont changé dans Kookia.</strong></p>
          {outdated ? <>
            <p>Valeurs enregistrées · {settings.covers} couverts, un imprévu tous les {settings.incidentEvery} jours.</p>
            <div className="workshop-actions">
              <button type="button" className="secondary" onClick={() => reconcile(false)}>Charger les réglages actuels</button>
              <button type="button" className="secondary" onClick={() => reconcile(true)}>Garder ma saisie</button>
            </div>
          </> : <button type="button" className="secondary" onClick={onRefresh}>Actualiser les réglages</button>}
        </div>}
        <div className="workshop-actions">
          <button type="submit" aria-disabled={busy || conflict || !changed}>{busy ? "Enregistrement…" : "Enregistrer les réglages"}</button>
          {saveState === "saved" && effectiveFrom && <p role="status" className="control-setting-saved"><Check size={16} aria-hidden="true" /> Enregistré pour le {displayDate(effectiveFrom)}.</p>}
          {saveState !== "saved" && !conflict && effectiveFrom && effectiveFrom > today && <p className="hint">Réglages en attente pour le {displayDate(effectiveFrom)}.</p>}
        </div>
        {saveState === "error" && <p className="error" role="alert">Enregistrement impossible. Réessayez.</p>}
      </form> : <dl className="workshop-facts">
        <div><dt>Couverts par jour ouvert</dt><dd>{settings.covers}</dd></div>
        <div><dt>Fréquence des imprévus</dt><dd>Tous les {settings.incidentEvery} jours</dd></div>
        {effectiveFrom && <div><dt>Applicable le</dt><dd><time dateTime={effectiveFrom}>{displayDate(effectiveFrom)}</time></dd></div>}
      </dl>}
    </details>
  </section>;
}
