import { CloudSun, SlidersHorizontal } from "lucide-react";
import { serviceSlotLabels } from "../../../shared/serviceCalendar";
import { useSharedServiceWeather } from "../../features/services/weather.context";
import { weatherButtonSummary } from "../../features/services/weatherPresentation";
import "./WeatherNavButton.css";

export default function WeatherNavButton() {
  const { state, service, settingsOpen, openSettings } = useSharedServiceWeather();
  const summary = weatherButtonSummary(state);
  const day = new Date(`${service.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
  const label = `Météo · ${serviceSlotLabels[service.slot]} · ${day}`;
  const place = state.weather?.position?.place.name;
  return <button type="button" className="weather-nav-button" aria-haspopup="dialog" aria-expanded={settingsOpen}
    aria-label={`${label}. ${place ? `${place}. ` : ""}${summary}. Ouvrir les réglages météo`} onClick={openSettings}>
    <CloudSun size={20} aria-hidden="true" />
    <span className="weather-nav-copy"><span className="weather-nav-label">{serviceSlotLabels[service.slot]} · {day}</span><strong>{summary}</strong></span>
    <SlidersHorizontal size={14} className="weather-nav-settings" aria-hidden="true" />
  </button>;
}
