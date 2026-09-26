import { displayDate, localToday, offsetDate } from "./scenario";
import type { Options } from "./scenario";

interface Props { value: Options; onChange: (value: Options) => void }
export function Settings({ value, onChange }: Props) {
  const update = <K extends keyof Options>(key: K, next: Options[K]) => onChange({ ...value, [key]: next });
  const end = value.start && value.days >= 1 && value.days <= 90 && Number.isFinite(Date.parse(value.start))
    ? offsetDate(value.start, value.days - 1) : "—";
  const preset = (offset: number, days: number) => onChange({ ...value, start: offsetDate(localToday(), offset), days });
  return <>
    <fieldset><legend>1. Choisissez votre période</legend>
      <div className="presets" aria-label="Périodes rapides">
        <button type="button" className="secondary" onClick={() => preset(-6, 7)}>7 derniers jours</button>
        <button type="button" className="secondary" onClick={() => preset(0, 7)}>7 jours dès aujourd’hui</button>
        <button type="button" className="secondary" onClick={() => preset(1, 14)}>14 jours à venir</button>
      </div>
      <div className="field-pair fields"><label>À partir du<input required type="date" value={value.start} onChange={e => update("start", e.target.value)}/></label>
        <label>Nombre de jours<input required type="number" min={1} max={90} value={value.days || ""} onChange={e => update("days", Number(e.target.value))}/></label></div>
      <p className="period-note">Jusqu’au <strong>{end === "—" ? end : displayDate(end)}</strong> inclus. De 1 à 90 jours, passés ou futurs.</p>
    </fieldset>
    <fieldset><legend>2. Ajustez l’activité</legend><div className="fields">
      <label>Couverts de référence par jour ouvert<input required type="number" min={5} max={200} value={value.covers || ""} onChange={e => update("covers", Number(e.target.value))}/></label>
      <label>Écart de fréquentation autour de la prévision : ± {value.variationPercent} %<input type="range" min={0} max={50} step={5} value={value.variationPercent} onChange={e => update("variationPercent", Number(e.target.value))}/></label>
      <p className="hint">La prévision suit la semaine et la saison. Ce réglage ajoute un écart au service, sans changer les achats prévus. À 0 %, les couverts suivent la prévision ; le choix des plats reste variable.</p>
    </div>
      <details><summary>Jours ouverts, services et carte</summary><div className="fields">
        <label>Services<select value={value.services} onChange={e => update("services", e.target.value as Options["services"])}>
          <option value="lunch">Midi uniquement</option><option value="dinner">Soir uniquement</option><option value="both">Midi et soir (60 % / 40 %)</option>
        </select></label>
        <fieldset><legend className="small-legend">Jours de fermeture</legend><div className="weekday-options">
          {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day, i) => <label className="check-label" key={day}>
            <input type="checkbox" checked={value.closedWeekdays.includes(i)} onChange={e => update("closedWeekdays", e.target.checked ? [...value.closedWeekdays, i] : value.closedWeekdays.filter(d => d !== i))}/>{day}
          </label>)}
        </div></fieldset>
        <label className="check-label"><input type="checkbox" checked={value.drinks} onChange={e => update("drinks", e.target.checked)}/>Inclure le café à la commande</label>
        <label className="check-label"><input type="checkbox" checked={value.mealDeals} onChange={e => update("mealDeals", e.target.checked)}/>Formule midi : 2 € de remise avec un plat</label>
        <p className="hint">Carte saisonnière tournante, deux plats au choix. Les commandes suivent les tournées fournisseurs. Les jours fermés peuvent recevoir une livraison.</p>
      </div></details>
      <details><summary>Affiner les repas et les pertes</summary><div className="fields">
        <label>Clients prenant une entrée : {value.starterPercent} %<input type="range" min={0} max={100} step={5} value={value.starterPercent} onChange={e => update("starterPercent", Number(e.target.value))}/></label>
        <label>Clients prenant un dessert : {value.dessertPercent} %<input type="range" min={0} max={100} step={5} value={value.dessertPercent} onChange={e => update("dessertPercent", Number(e.target.value))}/></label>
        <label>Sur-parage de référence : {value.lossPercent} %<input type="range" min={0} max={20} step={0.5} value={value.lossPercent} onChange={e => update("lossPercent", Number(e.target.value))}/></label>
        <p className="hint">Le sur-parage est pondéré par ingrédient et inclus dans le dosage brut. Échéances, altération, invendus et retours d’assiette sont suivis séparément. Les retours sont des estimations, pas des pesées.</p>
      </div></details>
    </fieldset>
    <fieldset><legend>3. Ajoutez des imprévus</legend><div className="fields">
      <label>Situation à rencontrer<select value={value.incident} onChange={e => update("incident", e.target.value as Options["incident"])}>
        <option value="normal">Pas d'incident ajouté</option><option value="mixed">Imprévus variés</option>
        <option value="short_delivery">Livraison incomplète + avoir</option><option value="late_delivery">Tournée fournisseur retardée</option>
        <option value="unavailable">Produit non livré</option><option value="high_waste">Lot frais altéré</option>
        <option value="demand_shift">Fréquentation inattendue</option><option value="refund">Article servi remboursé</option>
        <option value="stock_gap">Écart d’inventaire positif ou négatif</option>
      </select></label>
      {value.incident !== "normal" && <><label>Un incident tous les… jours<input required type="number" min={1} max={90} value={value.incidentEvery || ""} onChange={e => update("incidentEvery", Number(e.target.value))}/></label>
        <p className="hint">Un créneau tous les {value.incidentEvery || "…"} jours calendaires, depuis le début du dossier initial. Sur un jour fermé ou sans livraison concernée, l’incident peut être sans effet. Même sans incident ajouté, la demande peut dépasser la préparation.</p></>}
    </div></fieldset>
    <details className="identity-settings"><summary>Restaurant et numéro de dossier</summary><div className="fields">
      <label>Nom<input required maxLength={80} value={value.name} onChange={e => update("name", e.target.value)}/></label>
      <label>Adresse<input required maxLength={120} value={value.address} onChange={e => update("address", e.target.value)}/></label>
      <label>Ville<input required maxLength={80} value={value.city} onChange={e => update("city", e.target.value)}/></label>
      <label>Email<input required type="email" maxLength={120} value={value.email} onChange={e => update("email", e.target.value)}/></label>
      <label>Numéro de dossier<input required type="number" min={1} max={999999} value={value.seed || ""} onChange={e => update("seed", Number(e.target.value))}/></label>
      <p className="hint">Mêmes réglages et même numéro : mêmes résultats. Changez de numéro pour une autre répartition reproductible.</p>
      <button type="button" className="secondary" onClick={() => update("seed", value.seed >= 999999 ? 1 : value.seed + 1)}>Essayer une autre répartition</button>
    </div></details>
  </>;
}
