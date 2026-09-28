import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, CircleHelp, SlidersHorizontal, Sun } from "lucide-react";
import { weatherCondition } from "../../../shared/weatherConditions";
import { useSharedServiceWeather } from "../../features/services/weather.context";
import { weatherButtonSummary } from "../../features/services/weatherPresentation";
import "./WeatherNavButton.css";

const conditionIcons = { clear: Sun, partlyCloudy: CloudSun, cloudy: Cloud, fog: CloudFog,
  drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning, unknown: CircleHelp };
export default function WeatherNavButton() {
  const { state, service, settingsOpen, openSettings } = useSharedServiceWeather();
  const summary = weatherButtonSummary(state);
  const day = new Date(`${service.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
  const label = `Météo · ${day}`;
  const place = state.weather?.position?.place.name;
  const hasForecast = !state.loading && !state.error && state.weather && ["ready", "partial", "stale"].includes(state.weather.status);
  const ConditionIcon = conditionIcons[weatherCondition(hasForecast ? state.weather?.summary?.weatherCode : null).kind];
  return <button type="button" className="weather-nav-button" aria-haspopup="dialog" aria-expanded={settingsOpen}
    aria-label={`${label}. ${place ? `${place}. ` : ""}${summary}. Ouvrir les réglages météo`} onClick={openSettings}>
    <ConditionIcon size={20} aria-hidden="true" />
    <span className="weather-nav-copy"><span className="weather-nav-label">Météo · {day}</span><strong>{summary}</strong></span>
    <SlidersHorizontal size={14} className="weather-nav-settings" aria-hidden="true" />
  </button>;
}
