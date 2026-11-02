import { CalendarDays, CloudSun, Star } from "lucide-react";
import { useSharedServiceWeather } from "../../features/services/weather.context";
import { weatherButtonSummary } from "../../features/services/weatherPresentation";

export default function TodayContext() {
  const { state, settingsOpen, openSettings } = useSharedServiceWeather();
  const summary = weatherButtonSummary(state);
  const hasForecast = !state.loading && !state.error && state.weather && ["ready", "partial", "stale"].includes(state.weather.status);
  return <section className="today-card today-context" aria-labelledby="today-context-title">
    <h2 id="today-context-title">Contexte du jour</h2>
    <ul>
      <li><CloudSun aria-hidden="true" size={20} /><div><strong>Météo</strong>
        <p role={state.loading ? "status" : undefined}>{summary}</p>
        {hasForecast && <small>Prévision : {state.weather?.source}{state.weather?.position?.place.name ? ` · ${state.weather.position.place.name}` : ""}</small>}
        <button type="button" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={openSettings}>{state.weather?.status === "not_configured" ? "Configurer la météo" : "Voir la météo"}</button>
      </div></li>
      <li><CalendarDays aria-hidden="true" size={20} /><div><strong>Événements</strong><p>Informations indisponibles</p></div></li>
      <li><Star aria-hidden="true" size={20} /><div><strong>Avis</strong><p>Informations indisponibles</p></div></li>
    </ul>
  </section>;
}
