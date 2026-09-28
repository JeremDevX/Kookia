import { useState } from "react";
import Button from "../common/Button";
import WeatherLocationSettings from "../settings/WeatherLocationSettings";
import ServiceScheduleSettings from "../settings/ServiceScheduleSettings";
import ServiceWeatherPanel from "../services/ServiceWeatherPanel";
import { useSharedServiceWeather } from "../../features/services/weather.context";
import { serviceSlotLabels, type ServiceSlot } from "../../../shared/serviceCalendar";
import "../../pages/Sales.css";

export default function WeatherSettingsContent() {
  const { service, state, selectSlot, followsService, closeSettings } = useSharedServiceWeather();
  const [showSchedule, setShowSchedule] = useState(false);
  return <div className="weather-dialog">
    {followsService ? <p>Service sélectionné : {new Date(`${service.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} · {serviceSlotLabels[service.slot]}. Votre fiche reste ouverte.</p> :
      <label className="weather-service-select">Prévision d’aujourd’hui<select value={service.slot} onChange={event => selectSlot(event.target.value as ServiceSlot)}>
        <option value="lunch">Midi</option><option value="dinner">Soir</option>
      </select></label>}
    <WeatherLocationSettings onConfirmed={state.reload} />
    <Button type="button" variant="outline" aria-expanded={showSchedule} aria-controls="weather-schedule" onClick={() => setShowSchedule(value => !value)}>
      {showSchedule ? "Masquer les horaires" : "Régler les horaires des services"}
    </Button>
    {showSchedule && <div id="weather-schedule"><ServiceScheduleSettings key={`${service.date}:${service.slot}`} initialService={service} onSaved={state.reload} /></div>}
    <ServiceWeatherPanel date={service.date} slot={service.slot} state={state} />
    <div className="weather-dialog-footer"><Button type="button" onClick={closeSettings}>Terminer</Button></div>
  </div>;
}
