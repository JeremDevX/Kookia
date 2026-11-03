import { weekdays } from "./openingWeekdaysUtils";
import "./OpeningWeekdays.css";

export default function OpeningWeekdays({ value, onChange, disabled }: { value?: number[] | null; onChange: (value: number[] | null) => void; disabled?: boolean }) {
  return <fieldset className="opening-weekdays" disabled={disabled}>
    <legend>Jours d’ouverture</legend>
    <label><input type="checkbox" checked={value != null} onChange={event => onChange(event.target.checked ? [] : null)} /> Renseigner les jours d’ouverture</label>
    <div className="opening-weekdays-options">{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" aria-label={label} checked={value?.includes(day) ?? false} onChange={event => onChange(event.target.checked ? [...(value ?? []), day] : (value ?? []).filter(item => item !== day))} /> {label.slice(0, 3)} </label>)}</div>
    {value == null && <small>Jours non renseignés. Sélectionnez un jour pour les préciser.</small>}
    {value != null && value.length === 0 && <small>Aucun jour ouvert sélectionné.</small>}
  </fieldset>;
}
