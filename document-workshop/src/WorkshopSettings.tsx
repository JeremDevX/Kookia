import { useState, type SubmitEvent } from "react";
import type { WorkshopControl } from "../../shared/workshopControl";
import { saveWorkshopSettings, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate, offsetDate } from "./calendar";
import { formatParisDate } from "../../shared/parisDate";
import { serviceLabel, weekdays } from "./workshopPresentation";

export default function WorkshopSettings({ control, onSaved, onAccessError }: {
  control: WorkshopControl;
  onSaved: (settings: WorkshopControl["settings"]) => void;
  onAccessError: (cause: unknown) => void;
}) {
  const { restaurant, canManage, settings } = control;
  const [saveState, setSaveState] = useState<"busy" | "saved" | "error" | "idle">("idle");
  const effective = settings.effectiveFrom ? displayDate(settings.effectiveFrom) : null;
  const today = formatParisDate();
  const nextDate = displayDate(offsetDate(today, 1));
  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || saveState === "busy") return;
    const fields = new FormData(event.currentTarget);
    setSaveState("busy");
    try {
      const result = await saveWorkshopSettings({
        covers: Number(fields.get("covers")),
        incidentEvery: Number(fields.get("incidentEvery")),
        expectedRevision: Number(fields.get("revision")),
      });
      onSaved(result);
      setSaveState("saved");
    } catch (cause) {
      if (workshopAccessError(cause)) onAccessError(cause);
      else setSaveState("error");
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
      {canManage && <a className="workshop-link" href="/settings">Modifier dans Kookia</a>}
    </details>
    <details className="workshop-details">
      <summary><span>Simulation</span></summary>
      {canManage ? <form onSubmit={save}>
        <fieldset key={settings.revision} disabled={saveState === "busy"} aria-describedby="workshop-effective-setting">
          <input type="hidden" name="revision" value={settings.revision} />
          <div className="workshop-fields">
            <label>Couverts par jour ouvert<input name="covers" type="number" min={5} max={200} required defaultValue={settings.covers} /></label>
            <label>Un imprévu tous les… jours<input name="incidentEvery" type="number" min={1} max={90} required defaultValue={settings.incidentEvery} /></label>
          </div>
        </fieldset>
        {settings.effectiveFrom && settings.effectiveFrom > today && saveState !== "saved" && <p className="hint">Réglages en attente pour le {effective}.</p>}
        <p className="hint" id="workshop-effective-setting">Toute modification s’applique à partir du {nextDate}.</p>
        <div className="workshop-actions">
          <button type="submit" aria-disabled={saveState === "busy"}>{saveState === "busy" ? "Enregistrement…" : "Enregistrer les réglages"}</button>
          {saveState === "saved" && <p role="status">Enregistré pour le {effective}.</p>}
        </div>
        {saveState === "error" && <p className="error" role="alert">Enregistrement impossible. Réessayez ou actualisez la page.</p>}
      </form> : <dl className="workshop-facts">
        <div><dt>Couverts par jour ouvert</dt><dd>{settings.covers}</dd></div>
        <div><dt>Fréquence des imprévus</dt><dd>Tous les {settings.incidentEvery} jours</dd></div>
        {effective && <div><dt>En vigueur à partir du</dt><dd>{effective}</dd></div>}
      </dl>}
    </details>
  </section>;
}
