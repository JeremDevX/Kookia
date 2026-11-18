import type { WorkshopForecast } from "../../../shared/workshopForecast";
import { formatDisplayDate, formatQuantity } from "../../utils/format";
import Badge from "../common/Badge";

export function WorkshopCoversForecast({ forecast }: { forecast: WorkshopForecast }) {
  const maximum = Math.max(1, ...forecast.hours.map(row => row.covers));
  const hours = [...forecast.hours].sort((left, right) => left.hour - right.hour);
  return <section className="today-card today-covers" aria-labelledby="today-covers-title">
    <h2 id="today-covers-title">Prévision des couverts</h2>
    <Badge label="Simulation" status="neutral" />
    <p>Estimation du {formatDisplayDate(forecast.date)} à partir de la clôture du {formatDisplayDate(forecast.basedOnDate)}.</p>
    {hours.length ? <ul className="today-workshop-hours" role="list" aria-label="Couverts estimés par heure">
      {hours.map(({ hour, covers }) => <li key={hour}>
        <time dateTime={`${String(hour).padStart(2, "0")}:00`}>{hour} h</time>
        <meter min={0} max={maximum} value={covers} aria-hidden="true" />
        <strong>{formatQuantity(covers)} couvert{covers === 1 ? "" : "s"}</strong>
      </li>)}
    </ul> : <p>Aucun couvert prévu ce jour dans le scénario.</p>}
  </section>;
}

export function WorkshopPurchaseForecast({ products }: { products: WorkshopForecast["products"] }) {
  return <section className="today-card" aria-labelledby="today-workshop-purchases-title">
    <h2 id="today-workshop-purchases-title" tabIndex={-1}>Besoins d’achat estimés</h2>
    <Badge label="Simulation" status="neutral" />
    {products.length ? <ul className="today-workshop-products" role="list" aria-label="Produits suggérés dans le scénario">
      {products.map(product => <li key={JSON.stringify([product.name, product.supplier, product.unit, product.deliveryDate])}>
        <div><strong>{product.name}</strong><strong>{formatQuantity(product.quantityMilli / 1000)} {product.unit}</strong></div>
        <small>{product.supplier} · Livraison estimée le {formatDisplayDate(product.deliveryDate)}</small>
      </li>)}
    </ul> : <p>Aucun produit à prévoir dans le scénario du jour.</p>}
  </section>;
}
