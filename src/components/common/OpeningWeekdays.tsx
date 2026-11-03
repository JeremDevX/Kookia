import { weekdays } from "./openingWeekdaysUtils";

export default function OpeningWeekdays({ value, onChange, disabled }: { value?: number[] | null; onChange: (value: number[] | null) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled}>
    <legend>Jours d’ouverture</legend>
    <label><input type="checkbox" checked={value != null} onChange={event => onChange(event.target.checked ? [] : null)} /> Renseigner les jours d’ouverture</label>
    {value != null && <div>{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={value.includes(day)} onChange={event => onChange(event.target.checked ? [...value, day] : value.filter(item => item !== day))} /> {label} </label>)}</div>}
    {value != null && value.length === 0 && <small>Aucun jour ouvert sélectionné.</small>}
  </fieldset>;
}
