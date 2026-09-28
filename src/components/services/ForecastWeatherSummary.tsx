import { forecastWeatherExplanation, forecastWeatherNotice, type ForecastWeatherAdjustment } from "../../../shared/forecastWeather";
import { weatherCondition } from "../../../shared/weatherConditions";

export default function ForecastWeatherSummary({ adjustment }: { adjustment?: ForecastWeatherAdjustment }) {
  if (!adjustment) return null;
  return <div>
    <p><strong>{forecastWeatherExplanation(adjustment)}</strong></p>
    {adjustment.weather && <p>{adjustment.weather.city} · {weatherCondition(adjustment.weather.weatherCode).label} · prévision du {adjustment.weather.date},
      récupérée le {new Date(adjustment.weather.fetchedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>.</p>}
    <p><small>{forecastWeatherNotice}</small></p>
  </div>;
}
