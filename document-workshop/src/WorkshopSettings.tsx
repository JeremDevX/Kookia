import { useState, type SubmitEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import { saveWorkshopSettings, workshopAccessError } from "./automaticWorkshopApi";
import { displayDate } from "./calendar";
import { serviceLabel, weekdays } from "./workshopPresentation";

export default function WorkshopSettings({ control, onSaved, onAccessError }: {
  control: WorkshopControl;
  onSaved: (settings: WorkshopControl["settings"]) => void;
  onAccessError: (cause: unknown) => void;
}) {
  const { restaurant, canManage, settings } = control;
  const [saveState, setSaveState] = useState<"busy" | "saved" | "error" | "idle">("idle");
  const effective = settings.effectiveFrom ? displayDate(settings.effectiveFrom) : null;
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
      <h2 id="workshop-settings" className="section-heading"><span className="section-icon"><SlidersHorizontal size={18} aria-hidden="true" /></span>Réglages de la génération</h2>
    </div>
    <dl className="workshop-facts">
      <div><dt>Commune enregistrée dans Kookia</dt><dd>{restaurant.city || "Non renseignée"}</dd></div>
      <div><dt>Terrasse enregistrée dans Kookia</dt><dd>{restaurant.hasTerrace === null ? "Non renseignée" : restaurant.hasTerrace ? "Oui" : "Non"}</dd></div>
    </dl>
    <details className="workshop-details">
      <summary>Horaires habituels dans Kookia</summary>
      {restaurant.weeklyServices.length ? <ul className="workshop-rows" role="list">
        {[...restaurant.weeklyServices].sort((a, b) => (a.weekday + 6) % 7 - (b.weekday + 6) % 7).map(({ weekday, slot, opensAt, closesAt }) =>
          <li key={`${weekday}:${slot}`}><strong>{weekdays[weekday]} · {serviceLabel[slot]}</strong><span>{opensAt}–{closesAt}</span></li>)}
      </ul> : <p className="hint">Aucun horaire habituel renseigné.</p>}
      {canManage && <a className="workshop-link" href="/settings">Ouvrir les réglages du restaurant dans Kookia</a>}
    </details>
    {canManage ? <form onSubmit={save}>
      <fieldset key={settings.revision} disabled={saveState === "busy"} aria-describedby="workshop-effective-setting">
        <legend>Hypothèses du scénario</legend>
        <input type="hidden" name="revision" value={settings.revision} />
        <div className="workshop-fields">
          <label>Couverts de référence par jour ouvert<input name="covers" type="number" min={5} max={200} required defaultValue={settings.covers} /></label>
          <label>Fréquence des imprévus (en jours)<input name="incidentEvery" type="number" min={1} max={90} required defaultValue={settings.incidentEvery} /></label>
        </div>
      </fieldset>
      <p className="hint" id="workshop-effective-setting">{effective
        ? <>Date d’effet des réglages enregistrés · {effective}.</>
        : "Les nouveaux réglages s’appliquent à partir d’une date de service à venir."}</p>
      <div className="workshop-actions">
        <button type="submit" aria-disabled={saveState === "busy"}>{saveState === "busy" ? "Enregistrement…" : "Enregistrer les réglages"}</button>
        {saveState === "saved" && <p role="status">Réglages enregistrés.</p>}
      </div>
      {saveState === "error" && <p className="error" role="alert">Enregistrement impossible. Vérifiez les valeurs et réessayez. Si les réglages ont été modifiés entre-temps, actualisez l’atelier.</p>}
    </form> : <dl className="workshop-facts">
      <div><dt>Couverts de référence par jour ouvert</dt><dd>{settings.covers}</dd></div>
      <div><dt>Fréquence des imprévus</dt><dd>Tous les {settings.incidentEvery} jours</dd></div>
      {effective && <div><dt>En vigueur à partir du</dt><dd>{effective}</dd></div>}
    </dl>}
  </section>;
}
