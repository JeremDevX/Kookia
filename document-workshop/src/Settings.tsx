import { displayDate, offsetDate } from "./calendar";
import type { Options } from "./model";

const periods = [
  { label: "7 derniers jours", offset: -6, days: 7 },
  { label: "7 jours dès aujourd’hui", offset: 0, days: 7 },
  { label: "14 jours à venir", offset: 1, days: 14 },
];

const weekdays = [
  { day: "Lundi", index: 1 }, { day: "Mardi", index: 2 }, { day: "Mercredi", index: 3 },
  { day: "Jeudi", index: 4 }, { day: "Vendredi", index: 5 }, { day: "Samedi", index: 6 }, { day: "Dimanche", index: 0 },
];

function PercentageField({ label, value, max, step, signed = false, description, onChange }: {
  label: string;
  value: number;
  max: number;
  step: number;
  signed?: boolean;
  description?: string;
  onChange: (value: number) => void;
}) {
  const formatted = `${signed ? "± " : ""}${value} %`;
  return <label className="percentage-field">
    <span><span>{label}</span><strong aria-hidden="true">{formatted}</strong></span>
    <input type="range" min={0} max={max} step={step} value={value} aria-valuetext={formatted}
      aria-describedby={description} onChange={event => onChange(Number(event.target.value))} />
  </label>;
}

export function Settings({ value, today, continuing, onChange }: {
  value: Options;
  today: string;
  continuing: boolean;
  onChange: (value: Options) => void;
}) {
  const update = <K extends keyof Options>(key: K, next: Options[K]) => onChange({ ...value, [key]: next });
  const end = value.start && value.days >= 1 && value.days <= 90 && Number.isFinite(Date.parse(value.start))
    ? offsetDate(value.start, value.days - 1) : null;

  return <>
    <fieldset>
      <legend>Période</legend>
      {!continuing && <div className="presets" role="group" aria-label="Périodes rapides">
        {periods.map(({ label, offset, days }) => {
          const start = offsetDate(today, offset);
          return <button key={offset} type="button" className="secondary" aria-pressed={value.start === start && value.days === days}
            onClick={() => onChange({ ...value, start, days })}>{label}</button>;
        })}
      </div>}
      <div className="field-pair">
        <label>Date de début<input required type="date" value={value.start} readOnly={continuing}
          aria-describedby={continuing ? "reprise-debut" : undefined}
          onChange={event => update("start", event.target.value)} /></label>
        <label>Durée (jours)<input required type="number" min={1} max={90} value={value.days || ""}
          aria-describedby="dossier-duree" onChange={event => update("days", Number(event.target.value))} /></label>
      </div>
      {continuing && <p className="hint" id="reprise-debut">La reprise commence le lendemain de la clôture.</p>}
      <p className="hint dossier-duration" id="dossier-duree">
        {end && <>Dernier jour <strong><time dateTime={end}>{displayDate(end)}</time></strong> · </>}1 à 90 jours
      </p>
    </fieldset>
    <fieldset>
      <legend>Fréquentation</legend>
      <label>Couverts par jour ouvert<input required type="number" min={5} max={200} value={value.covers || ""}
        aria-describedby="dossier-couverts" onChange={event => update("covers", Number(event.target.value))} /></label>
      <p className="hint dossier-duration" id="dossier-couverts">5 à 200 couverts</p>
    </fieldset>

    <details className="workshop-details advanced-settings">
      <summary><span>Réglages avancés</span></summary>
      <details className="workshop-details"><summary><span>Terrasse et météo</span></summary><div className="fields">
        <label>Terrasse<select value={value.hasTerrace === null ? "unknown" : value.hasTerrace ? "yes" : "no"}
          onChange={event => update("hasTerrace", event.target.value === "unknown" ? null : event.target.value === "yes")}>
          <option value="unknown">Non renseignée</option><option value="yes">Oui</option><option value="no">Non</option>
        </select></label>
        <label>Météo simulée<select aria-describedby="workshop-weather-help" value={value.weather}
          onChange={event => update("weather", event.target.value as Options["weather"])}>
          <option value="none">Sans météo</option><option value="varied">Conditions variées</option>
          <option value="clear">Éclaircies</option><option value="rain">Pluie</option><option value="fog">Brouillard</option><option value="storm">Orage et vent fort</option>
        </select></label>
        <p id="workshop-weather-help" className="hint">Avec une terrasse, la météo pèse davantage sur les couverts, les achats et les préparations.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Services et carte</span></summary><div className="fields">
        <label>Services<select value={value.services} onChange={event => update("services", event.target.value as Options["services"])}>
          <option value="lunch">Midi uniquement</option><option value="dinner">Soir uniquement</option><option value="both">Midi et soir (60 % / 40 %)</option>
        </select></label>
        <fieldset className="closure-days"><legend className="small-legend">Jours de fermeture</legend><div className="weekday-options">
          {weekdays.map(({ day, index }) => <label className="check-label" key={day}>
            <input type="checkbox" checked={value.closedWeekdays.includes(index)}
              onChange={event => update("closedWeekdays", event.target.checked ? [...value.closedWeekdays, index] : value.closedWeekdays.filter(item => item !== index))} />{day}
          </label>)}
        </div>
          {value.closedWeekdays.length === weekdays.length && <p className="error" role="alert">Gardez au moins un jour ouvert.</p>}
        </fieldset>
        <label className="check-label"><input type="checkbox" checked={value.drinks} onChange={event => update("drinks", event.target.checked)} />Café à la commande</label>
        <label className="check-label"><input type="checkbox" checked={value.mealDeals} onChange={event => update("mealDeals", event.target.checked)} />Formule du midi avec un plat · 2 € de remise</label>
        <p className="hint">Les livraisons restent possibles les jours de fermeture.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Fréquentation, repas et pertes</span></summary><div className="fields">
        <PercentageField label="Variation de fréquentation" value={value.variationPercent} max={50} step={5} signed
          description="dossier-variation" onChange={next => update("variationPercent", next)} />
        <p className="hint" id="dossier-variation">La variation porte sur le service. Les achats prévus gardent leur base.</p>
        <PercentageField label="Couverts avec entrée" value={value.starterPercent} max={100} step={5} onChange={next => update("starterPercent", next)} />
        <PercentageField label="Couverts avec dessert" value={value.dessertPercent} max={100} step={5} onChange={next => update("dessertPercent", next)} />
        <PercentageField label="Pertes supplémentaires au parage" value={value.lossPercent} max={20} step={0.5}
          description="dossier-parage" onChange={next => update("lossPercent", next)} />
        <p className="hint" id="dossier-parage">Le sur-parage entre dans le poids brut des ingrédients.</p>
      </div></details>
      <details className="workshop-details"><summary><span>Imprévus</span></summary><div className="fields">
        <label>Type d’imprévu<select value={value.incident} onChange={event => update("incident", event.target.value as Options["incident"])}>
          <option value="normal">Aucun imprévu ajouté</option><option value="mixed">Imprévus variés</option>
          <option value="short_delivery">Livraison incomplète avec avoir</option><option value="late_delivery">Tournée fournisseur retardée</option>
          <option value="unavailable">Produit non livré</option><option value="high_waste">Lot frais altéré</option>
          <option value="demand_shift">Fréquentation inattendue</option><option value="refund">Article servi remboursé</option>
          <option value="stock_gap">Écart d’inventaire</option>
        </select></label>
        {value.incident !== "normal" && <><label>Un imprévu tous les… jours<input required type="number" min={1} max={90} value={value.incidentEvery || ""}
          aria-describedby="dossier-imprevus" onChange={event => update("incidentEvery", Number(event.target.value))} /></label>
          <p className="hint" id="dossier-imprevus">Le rythme part du dossier initial. L’imprévu dépend des services et livraisons du jour.</p></>}
      </div></details>
      <details className="workshop-details"><summary><span>Restaurant et numéro de dossier</span></summary><div className="fields">
        <label>Nom du restaurant<input required maxLength={80} value={value.name} onChange={event => update("name", event.target.value)} /></label>
        <label>Adresse<input required maxLength={120} value={value.address} onChange={event => update("address", event.target.value)} /></label>
        <label>Ville<input required maxLength={80} value={value.city} onChange={event => update("city", event.target.value)} /></label>
        <label>Email<input required type="email" maxLength={120} value={value.email} onChange={event => update("email", event.target.value)} /></label>
        <label>Numéro de dossier<input required type="number" min={1} max={999999} value={value.seed || ""} readOnly={continuing}
          aria-describedby="dossier-numero" onChange={event => update("seed", Number(event.target.value))} /></label>
        <p className="hint" id="dossier-numero">{continuing ? "Le numéro vient du dossier repris." : "Même numéro et mêmes réglages, même dossier."}</p>
        {!continuing && <button type="button" className="secondary" onClick={() => update("seed", value.seed >= 999999 ? 1 : value.seed + 1)}>Changer de numéro</button>}
      </div></details>
    </details>
  </>;
}
