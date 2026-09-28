import { useState } from "react";
import Button from "../common/Button";
import WeatherLocationSettings from "../settings/WeatherLocationSettings";
import ServiceWeatherPanel from "../services/ServiceWeatherPanel";
import { useSharedServiceWeather } from "../../features/services/weather.context";

export default function WeatherSettingsContent() {
  const { service, state, closeSettings } = useSharedServiceWeather();
  const [showForecast, setShowForecast] = useState(false);
  return <div className="weather-dialog">
    <WeatherLocationSettings onConfirmed={state.reload} />
    <Button type="button" variant="outline" aria-expanded={showForecast} aria-controls="weather-forecast" onClick={() => setShowForecast(value => !value)}>
      {showForecast ? "Masquer les prévisions" : "Voir les prévisions de la journée"}
    </Button>
    {showForecast && <div id="weather-forecast"><ServiceWeatherPanel date={service.date} state={state} /></div>}
    <div className="weather-dialog-footer"><Button type="button" onClick={closeSettings}>Terminer</Button></div>
  </div>;
}
