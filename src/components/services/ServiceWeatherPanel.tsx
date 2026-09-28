import { useId } from "react";
import Button from "../common/Button";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import { serviceSlotLabels } from "../../../shared/serviceCalendar";
import type { ServiceWeather, WeatherDecisionContext } from "../../../shared/serviceWeather";
import type { useServiceWeather } from "../../features/services/useServiceWeather";
import "./ServiceWeather.css";

const number = (value: number | null | undefined) => value == null ? "Inconnu" : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const dateTime = (value: string) => new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
export function WeatherSummary({ weather }: { weather: ServiceWeather }) {
  return <>
    {weather.position && <p>{weather.position.place.name} · {weather.position.place.region} · {weather.position.place.country} <small>(prévision à l’échelle de la commune)</small></p>}
    {weather.window && <p>{serviceSlotLabels[weather.slot]} · {weather.window.opensAt}–{weather.window.closesAt} · heure de Paris</p>}
    {weather.provenance === "fixture" && <p>Données de test, sans observation météo réelle.</p>}
    {weather.reason && <p role="status">{weather.reason}</p>}
    {weather.summary && <>
      <dl className="service-weather-metrics">
        <div><dt>Température prévue</dt><dd>{number(weather.summary.temperatureMin)} à {number(weather.summary.temperatureMax)} °C</dd></div>
        <div><dt>Pluie : probabilité horaire maximale</dt><dd>{number(weather.summary.maxHourlyPrecipitationProbability)} %</dd></div>
        <div><dt>Vent maximal prévu</dt><dd>{number(weather.summary.maxWindSpeed)} km/h</dd></div>
      </dl>
      <details><summary>Voir les prévisions heure par heure</summary>
        <p>Les valeurs correspondent aux heures indiquées, pas à une mesure en salle. La probabilité maximale n’est pas celle de l’ensemble du service. Les précipitations portent sur l’heure précédente.</p>
        <ul className="service-weather-hours">{weather.hours.map(hour => <li key={hour.time}>
          <strong>{new Date(hour.time).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</strong>
          <span>{number(hour.temperature)} °C · pluie {number(hour.precipitation)} mm · probabilité {number(hour.precipitationProbability)} % · vent {number(hour.windSpeed)} km/h</span>
        </li>)}</ul>
        <p>{weather.completeHours} heures entièrement renseignées sur {weather.expectedHours} attendues.</p>
      </details>
    </>}
    {weather.fetchedAt && <p><small>Récupérée le {dateTime(weather.fetchedAt)} · {weather.status === "stale" ? "ancienne prévision" : "prévision, pas observation"}.</small></p>}
    <p><small>Source : <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · localisation <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>.</small></p>
  </>;
}
export function WeatherDecisionSummary({ context }: { context?: WeatherDecisionContext }) {
  if (!context) return null;
  return <details className="service-weather-history"><summary>Météo à la validation du plan</summary>
    {context.status === "saved" ? <><p>Contexte conservé avec la décision, sans ajustement automatique des portions.</p><WeatherSummary weather={context.weather} /></> :
      <p>{context.reason === "not_consulted" ? "Aucun contexte météo consulté n’a été joint au plan." : "Le contexte météo n’a pas pu être conservé. Le plan a bien été validé."}</p>}
  </details>;
}
export default function ServiceWeatherPanel({ date, slot, state }: {
  date: string; slot: ServiceSlot; state: ReturnType<typeof useServiceWeather>;
}) {
  const titleId = useId();
  return <section className="service-weather" aria-labelledby={titleId}>
    <h2 id={titleId}>Météo du service · {serviceSlotLabels[slot].toLocaleLowerCase("fr-FR")}</h2>
    <p>{new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" })}</p>
    {state.loading && <p role="status">Chargement de la météo… Vous pouvez continuer à préparer le service.</p>}
    {state.error && <p role="alert">{state.error} Vous pouvez continuer sans météo.</p>}
    {state.weather && <WeatherSummary weather={state.weather} />}
    <div className="service-weather-actions">
      <Button type="button" variant="outline" disabled={state.loading} onClick={state.reload}>{state.error ? "Réessayer la météo" : "Actualiser la météo"}</Button>
    </div>
    <p><small>La météo éclaire votre décision ; elle ne modifie pas les quantités proposées.</small></p>
  </section>;
}
