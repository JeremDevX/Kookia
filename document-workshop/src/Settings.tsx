import { displayDate, offsetDate } from "./calendar";
import { formatParisDate } from "../../shared/parisDate";
import type { Options } from "./model";

interface Props { value: Options; onChange: (value: Options) => void }
export function Settings({ value, onChange }: Props) {
  const update = <K extends keyof Options>(key: K, next: Options[K]) => onChange({ ...value, [key]: next });
  const end = value.start && value.days >= 1 && value.days <= 90 && Number.isFinite(Date.parse(value.start))
    ? offsetDate(value.start, value.days - 1) : "—";
  const preset = (offset: number, days: number) => onChange({ ...value, start: offsetDate(formatParisDate(), offset), days });
  return <>
    <fieldset><legend>Période</legend>
      <div className="presets" aria-label="Périodes rapides">
        <button type="button" className="secondary" onClick={() => preset(-6, 7)}>7 derniers jours</button>
        <button type="button" className="secondary" onClick={() => preset(0, 7)}>7 jours dès aujourd’hui</button>
        <button type="button" className="secondary" onClick={() => preset(1, 14)}>14 jours à venir</button>
      </div>
      <div className="field-pair"><label>Date de début<input required type="date" value={value.start} onChange={e => update("start", e.target.value)}/></label>
        <label>Durée (jours)<input required type="number" min={1} max={90} value={value.days || ""} onChange={e => update("days", Number(e.target.value))}/></label></div>
      <p className="period-note">Fin le <strong>{end === "—" ? end : displayDate(end)}</strong> inclus · 1 à 90 jours</p>
    </fieldset>
    <fieldset><legend>Activité</legend><div className="fields">
      <label>Couverts par jour ouvert<input required type="number" min={5} max={200} value={value.covers || ""} onChange={e => update("covers", Number(e.target.value))}/></label>
      <label>Variation de fréquentation · ± {value.variationPercent} %<input type="range" min={0} max={50} step={5} value={value.variationPercent} onChange={e => update("variationPercent", Number(e.target.value))}/></label>
      <p className="hint">Modifie la fréquentation du service. Les achats prévus gardent leur base.</p>
    </div></fieldset>
    <details className="workshop-details"><summary><span>Réglages avancés</span></summary>
      <details className="workshop-details"><summary><span>Terrasse et météo</span></summary><div className="fields">
        <label>Terrasse<select aria-describedby="workshop-weather-help" value={value.hasTerrace === null ? "unknown" : value.hasTerrace ? "yes" : "no"}
          onChange={e => update("hasTerrace", e.target.value === "unknown" ? null : e.target.value === "yes")}>
          <option value="unknown">Non renseignée</option><option value="yes">Oui</option><option value="no">Non</option>
        </select></label>
        <label>Météo du dossier<select aria-describedby="workshop-weather-help" value={value.weather} onChange={e => update("weather", e.target.value as Options["weather"])}>
          <option value="none">Sans météo</option><option value="varied">Conditions variées</option>
          <option value="clear">Éclaircies</option><option value="rain">Pluie</option><option value="fog">Brouillard</option><option value="storm">Orage et vent fort</option>
        </select></label>
        <p id="workshop-weather-help" className="hint">Météo simulée. Avec une terrasse, son effet sur les couverts, les achats et les préparations est plus marqué.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Services et carte</span></summary><div className="fields">
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
        <p className="hint">Les livraisons restent possibles les jours de fermeture.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Repas et pertes</span></summary><div className="fields">
        <label>Entrées · {value.starterPercent} %<input type="range" min={0} max={100} step={5} value={value.starterPercent} onChange={e => update("starterPercent", Number(e.target.value))}/></label>
        <label>Desserts · {value.dessertPercent} %<input type="range" min={0} max={100} step={5} value={value.dessertPercent} onChange={e => update("dessertPercent", Number(e.target.value))}/></label>
        <label>Sur-parage · {value.lossPercent} %<input type="range" min={0} max={20} step={0.5} value={value.lossPercent} onChange={e => update("lossPercent", Number(e.target.value))}/></label>
        <p className="hint">Le sur-parage entre dans le poids brut des ingrédients. Les retours d’assiette sont estimés.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Imprévus</span></summary><div className="fields">
        <label>Type d’imprévu<select value={value.incident} onChange={e => update("incident", e.target.value as Options["incident"])}>
          <option value="normal">Aucun imprévu ajouté</option><option value="mixed">Imprévus variés</option>
          <option value="short_delivery">Livraison incomplète + avoir</option><option value="late_delivery">Tournée fournisseur retardée</option>
          <option value="unavailable">Produit non livré</option><option value="high_waste">Lot frais altéré</option>
          <option value="demand_shift">Fréquentation inattendue</option><option value="refund">Article servi remboursé</option>
          <option value="stock_gap">Écart d’inventaire positif ou négatif</option>
        </select></label>
        {value.incident !== "normal" && <><label>Un imprévu tous les… jours<input required type="number" min={1} max={90} value={value.incidentEvery || ""} onChange={e => update("incidentEvery", Number(e.target.value))}/></label>
          <p className="hint">Le rythme part du dossier initial. Un imprévu peut être sans effet si le restaurant est fermé ou si aucune livraison n’est prévue.</p></>}
      </div></details>
      <details className="workshop-details"><summary><span>Restaurant et numéro de dossier</span></summary><div className="fields">
        <label>Nom<input required maxLength={80} value={value.name} onChange={e => update("name", e.target.value)}/></label>
        <label>Adresse<input required maxLength={120} value={value.address} onChange={e => update("address", e.target.value)}/></label>
        <label>Ville<input required maxLength={80} value={value.city} onChange={e => update("city", e.target.value)}/></label>
        <label>Email<input required type="email" maxLength={120} value={value.email} onChange={e => update("email", e.target.value)}/></label>
        <label>Numéro de dossier<input required type="number" min={1} max={999999} value={value.seed || ""} onChange={e => update("seed", Number(e.target.value))}/></label>
        <p className="hint">À réglages et numéro identiques, le dossier se reproduit à l’identique.</p>
        <button type="button" className="secondary" onClick={() => update("seed", value.seed >= 999999 ? 1 : value.seed + 1)}>Essayer une autre répartition</button>
      </div></details>
    </details>
  </>;
}
