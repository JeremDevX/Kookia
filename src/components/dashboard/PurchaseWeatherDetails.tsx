import type { ForecastWeatherReference } from "../../../shared/forecastWeather";
import ForecastWeatherSummary from "../services/ForecastWeatherSummary";

export default function PurchaseWeatherDetails({ references }: { references?: ForecastWeatherReference[] }) {
  if (!references?.length) return null;
  return <details><summary>Influence de la météo</summary>
    {references.map(reference => <div key={`${reference.date}:${reference.slot}`}>
      <p>{reference.date} · {reference.slot === "lunch" ? "Midi" : "Soir"}</p>
      <ForecastWeatherSummary adjustment={reference.adjustment} />
    </div>)}
  </details>;
}
