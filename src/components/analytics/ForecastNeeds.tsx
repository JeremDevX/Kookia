import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OperationalForecast } from "../../../shared/operationalForecast";
import { getOperationalForecast } from "../../services/serviceOperationsService";
import { forecastWeek } from "./forecastNeedsDate";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import Button from "../common/Button";
import ForecastWeatherSummary from "../services/ForecastWeatherSummary";

const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
type Result = { status: "loading" } | { status: "error"; message: string } | { status: "success"; forecast: OperationalForecast };

export function ForecastNeedsContent({ result, retry }: { result: Result; retry: () => void }) {
  if (result.status === "loading") return <p role="status">Calcul des besoins prévus…</p>;
  if (result.status === "error") return <div role="alert"><p>Besoins indisponibles : {result.message}</p>
    <Button type="button" variant="outline" onClick={retry}>Réessayer</Button></div>;
  const { forecast } = result;
  const weather = forecast.services.filter((service) => service.plannedOpen && service.weatherAdjustment?.status === "applied");
  return <>
    <p>Du {date(forecast.fromDate)} au {date(forecast.throughDate)} inclus · ventes prises en compte jusqu’au {date(forecast.asOfDate)}.</p>
    <p>Estimations issues des ventes complètes par service et des cartes datées. Elles ne tiennent pas compte du stock et ne créent aucune commande.</p>
    {forecast.blockers.length > 0 && <div className="sales-baseline-guidance"><h3>Estimation partielle</h3>
      <p>Certains besoins ne peuvent pas être calculés. Vérifiez les horaires, les cartes et les ventes des services.</p>
      <details><summary>Voir les limites</summary><ul>{forecast.blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}</ul></details>
      <Link to="/services">Vérifier les services</Link></div>}
    {forecast.ingredientNeeds.length ? <div className="sales-table-wrap" role="region" aria-label="Besoins estimés en ingrédients" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
      <table className="sales-table"><thead><tr><th scope="col">Produit</th><th scope="col">Besoin estimé</th></tr></thead>
        <tbody>{forecast.ingredientNeeds.map((ingredient) => <tr key={ingredient.productId}>
          <th scope="row">{ingredient.productName}</th><td>{ingredient.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {ingredient.unit}</td>
        </tr>)}</tbody></table></div>
      : <p role="status">Aucun besoin calculable pour les services planifiés.</p>}
    {weather.length > 0 && <details className="sales-baseline-method"><summary>Ajustements météo appliqués</summary>
      {weather.map((service) => <div key={`${service.date}:${service.slot}`}><h3>{date(service.date)} · {service.slot === "lunch" ? "midi" : "soir"}</h3>
        <ForecastWeatherSummary adjustment={service.weatherAdjustment} /></div>)}</details>}
    <details className="sales-baseline-method"><summary>Comprendre les estimations</summary>
      <p>Source : {forecast.provenance === "recorded_sales" ? "ventes enregistrées" : forecast.provenance === "demo_simulation" ? "espace de démonstration" : "historique de provenance mixte"} · {forecast.excludedServices} services exclus.</p>
      <ul>{forecast.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
    </details>
  </>;
}

export default function ForecastNeeds() {
  const [range, setRange] = useState(() => forecastWeek(new Date()));
  const [revision, setRevision] = useState(0);
  const key = `${range.from}:${range.to}:${revision}`;
  const [response, setResponse] = useState<{ key: string; result: Result } | null>(null);
  const result: Result = response?.key === key ? response.result : { status: "loading" };
  useEffect(() => {
    const refreshDate = () => {
      const next = forecastWeek(new Date());
      setRange((current) => current.from === next.from ? current : next);
    };
    const timer = window.setInterval(refreshDate, 60_000);
    document.addEventListener("visibilitychange", refreshDate);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshDate); };
  }, []);
  useEffect(() => {
    let active = true;
    void getOperationalForecast(range.from, range.to).then((forecast) => {
      if (active) setResponse({ key, result: { status: "success", forecast } });
    }).catch((cause: unknown) => {
      if (active) setResponse({ key, result: { status: "error", message: cause instanceof Error ? cause.message : "Réessayez." } });
    });
    return () => { active = false; };
  }, [range, key]);
  return <section className="sales-panel" aria-labelledby="forecast-needs-title">
    <h2 id="forecast-needs-title">Besoins prévus · 7 prochains jours</h2>
    <ForecastNeedsContent result={result} retry={() => setRevision((value) => value + 1)} />
  </section>;
}
