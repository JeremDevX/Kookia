import { Link } from "react-router-dom";
import { purchasePreparationHref } from "../../features/orders/orderNavigation";
import { useClientPresentation } from "../../features/members/workspaceContext";
import { formatParisTime } from "../../../shared/parisDate";
import type { WorkshopForecast } from "../../../shared/workshopForecast";
import { formatDisplayDate, formatQuantity } from "../../utils/format";
import Badge from "../common/Badge";

const terraces = { open: "Terrasse ouverte (simulation)", closed: "Terrasse fermée (simulation)",
  none: "Sans terrasse", unknown: "Terrasse indéterminée" } as const;
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", signDisplay: "exceptZero" });

export function WorkshopCoversForecast({ forecast }: { forecast: WorkshopForecast }) {
  const clientPresentation = useClientPresentation();
  const maximum = Math.max(1, ...forecast.hours.map(row => row.covers));
  const hours = [...forecast.hours].sort((left, right) => left.hour - right.hour);
  return <section className="today-card" aria-labelledby="today-covers-title">
    <h2 id="today-covers-title">Prévision des couverts</h2>
    {!clientPresentation && <Badge label="Simulation" status="neutral" />}
    <p>Estimation du {formatDisplayDate(forecast.date)} à partir de la clôture du {formatDisplayDate(forecast.basedOnDate)}.</p>
    {forecast.serviceWeather?.map(weather => <p key={weather.slot}>
      <strong>{weather.slot === "lunch" ? "Midi" : "Soir"} · {terraces[weather.terrace]}</strong><br />
      {weather.reason}{weather.percent !== 0 && ` Couverts prévus ${percent.format(weather.percent / 100)}.`}
      {weather.fetchedAt && <small> · Relevé à {formatParisTime(new Date(weather.fetchedAt))}</small>}
    </p>)}
    {forecast.serviceWeather?.some(weather => weather.fetchedAt) &&
      <p><small>Coefficients de simulation indicatifs. Prévisions <a href="https://open-meteo.com/">Open-Meteo</a>.</small></p>}
    {hours.length ? <ul className="today-workshop-hours" role="list" aria-label="Couverts estimés par heure">
      {hours.map(({ hour, covers }) => <li key={hour}>
        <time dateTime={`${String(hour).padStart(2, "0")}:00`}>{hour} h</time>
        <meter min={0} max={maximum} value={covers} aria-hidden="true" />
        <strong>{formatQuantity(covers)} couvert{covers === 1 ? "" : "s"}</strong>
      </li>)}
    </ul> : <p>{clientPresentation ? "Aucun couvert prévu ce jour." : "Aucun couvert prévu ce jour dans le scénario."}</p>}
  </section>;
}

export function WorkshopPurchaseForecast({ forecast }: { forecast: WorkshopForecast }) {
  const { products, purchaseNeeds } = forecast;
  const clientPresentation = useClientPresentation();
  return <section className="today-card" aria-labelledby="today-workshop-purchases-title">
    <h2 id="today-workshop-purchases-title" tabIndex={-1}>Besoins d’achat estimés</h2>
    {!purchaseNeeds && !clientPresentation && <Badge label="Simulation" status="neutral" />}
    {purchaseNeeds ? <div className="today-card-actions"><Link to={purchasePreparationHref}>Voir les suggestions d’achat</Link></div>
      : products.length ? <ul className="today-workshop-products" role="list" aria-label={clientPresentation ? "Produits suggérés" : "Produits suggérés dans le scénario"}>
      {products.map(product => <li key={JSON.stringify([product.name, product.supplier, product.unit, product.deliveryDate])}>
        <div><strong>{product.name}</strong><strong>{formatQuantity(product.quantityMilli / 1000)} {product.unit}</strong></div>
        <small>{product.supplier} · Livraison estimée le {formatDisplayDate(product.deliveryDate)}</small>
      </li>)}
    </ul> : <p>{clientPresentation ? "Aucun produit à prévoir aujourd’hui." : "Aucun produit à prévoir dans le scénario du jour."}</p>}
  </section>;
}
