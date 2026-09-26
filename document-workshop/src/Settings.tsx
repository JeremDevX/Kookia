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
      <label>Couverts moyens par jour<input required type="number" min={5} max={200} value={value.covers || ""} onChange={e => update("covers", Number(e.target.value))}/></label>
      <label>Variation quotidienne : ± {value.variationPercent} %<input type="range" min={0} max={50} step={5} value={value.variationPercent} onChange={e => update("variationPercent", Number(e.target.value))}/></label>
      <p className="hint">Environ {Math.max(5, Math.round(value.covers * (1 - value.variationPercent / 100)))} à {Math.max(5, Math.round(value.covers * (1 + value.variationPercent / 100)))} couverts par jour. À 0 %, la fréquentation reste constante.</p>
    </div>
      <details><summary>Affiner les repas et les pertes</summary><div className="fields">
        <label>Clients prenant une entrée : {value.starterPercent} %<input type="range" min={20} max={100} step={5} value={value.starterPercent} onChange={e => update("starterPercent", Number(e.target.value))}/></label>
        <label>Clients prenant un dessert : {value.dessertPercent} %<input type="range" min={20} max={100} step={5} value={value.dessertPercent} onChange={e => update("dessertPercent", Number(e.target.value))}/></label>
        <label>Pertes matières habituelles : {value.lossPercent} %<input type="range" min={0} max={20} step={0.5} value={value.lossPercent} onChange={e => update("lossPercent", Number(e.target.value))}/></label>
        <p className="hint">Chaque couvert prend un plat. Les achats et les quantités produites s’adaptent aux repas et aux pertes.</p>
      </div></details>
    </fieldset>
    <fieldset><legend>3. Ajoutez des imprévus</legend><div className="fields">
      <label>Situation à rencontrer<select value={value.incident} onChange={e => update("incident", e.target.value as Options["incident"])}>
        <option value="normal">Aucun incident</option><option value="short_delivery">Livraison incomplète + avoir</option><option value="high_waste">Pertes matières élevées (+10 points)</option><option value="refund">Un repas remboursé</option><option value="stock_gap">Écart d’inventaire (+250 g)</option>
      </select></label>
      {value.incident !== "normal" && <><label>Un incident tous les… jours<input required type="number" min={1} max={90} value={value.incidentEvery || ""} onChange={e => update("incidentEvery", Number(e.target.value))}/></label>
        <p className="hint">{Math.floor(value.days / value.incidentEvery) || 0} incident(s) sur la période. Premier incident au jour {value.incidentEvery || "…"}, les autres jours restent habituels.</p></>}
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
