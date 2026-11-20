import { purchasePreparationHref } from "../../src/features/orders/orderNavigation";
import { ArrowUpRight } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import type { WorkshopForecast } from "../../shared/workshopForecast";
import { displayDate, weekday } from "./calendar";
import { quantity, serviceLabel } from "./workshopPresentation";
import { formatParisTime } from "../../shared/parisDate";

const terraceStatus = { open: "Terrasse ouverte", closed: "Terrasse fermée", none: "Sans terrasse", unknown: "Terrasse non renseignée" };

function ServicePreview({ slot, planned, hours, weather }: {
  slot: keyof typeof serviceLabel;
  planned?: NonNullable<WorkshopForecast["plannedServices"]>[number];
  hours?: { opensAt: string; closesAt: string };
  weather?: NonNullable<WorkshopForecast["serviceWeather"]>[number];
}) {
  const weatherEffect = weather?.percent ? `${weather.percent > 0 ? "+" : "−"}${Math.abs(weather.percent)} %` : null;
  return <article className="workshop-service">
    <header className="service-heading">
      <h3>{serviceLabel[slot]}</h3>
      {hours && <p>{hours.opensAt}–{hours.closesAt}</p>}
    </header>
    {planned ? <>
      <p className="service-total"><strong>{quantity(planned.forecastCovers)}</strong> couverts prévus</p>
      <dl className="service-facts">
        <div><dt>Avant météo</dt><dd>{quantity(planned.baselineCovers)} couverts</dd></div>
        <div><dt>À préparer</dt><dd>{quantity(planned.plannedPortions)} portions</dd></div>
      </dl>
    </> : <p className="hint">Prévision de service indisponible.</p>}
    <footer className="service-weather">
      <p><strong>{weather ? terraceStatus[weather.terrace] : "Terrasse non estimée"}</strong>
        {weatherEffect && <span className="weather-effect">Effet météo {weatherEffect}</span>}</p>
      <p className="hint">{weather?.reason ?? "Météo indisponible."}</p>
      {weather?.fetchedAt && <p className="workshop-muted">
        Open-Meteo · <time dateTime={weather.fetchedAt}>relevé à {formatParisTime(new Date(weather.fetchedAt))}</time>
      </p>}
    </footer>
  </article>;
}

export function WorkshopToday({ date, forecast, weeklyServices }: {
  date: string;
  forecast: WorkshopForecast | null;
  weeklyServices: WorkshopControl["restaurant"]["weeklyServices"];
}) {
  const scheduled = weeklyServices.filter(service => service.weekday === weekday(date));
  const slots = forecast?.plannedServices?.map(row => row.slot) ?? (["lunch", "dinner"] as const).filter(slot =>
    scheduled.some(row => row.slot === slot) || forecast?.serviceWeather?.some(row => row.slot === slot));
  return <section className="panel workshop-today" aria-labelledby="workshop-today">
    <div className="workshop-heading">
      <h2 id="workshop-today">Aujourd’hui</h2>
      <time className="workshop-muted" dateTime={date}>{displayDate(date)}</time>
    </div>
    {forecast && <p className="workshop-subtitle">Simulation d’après la clôture du {displayDate(forecast.basedOnDate)}{(!forecast.plannedServices || slots.length > 1) && <> · {quantity(forecast.covers)} couverts au total</>}</p>}
    {slots.length ? <div className="workshop-services">
      {slots.map(slot => {
        const planned = forecast?.plannedServices?.find(row => row.slot === slot);
        return <ServicePreview key={slot} slot={slot} planned={planned} hours={planned ?? scheduled.find(row => row.slot === slot)}
          weather={forecast?.serviceWeather?.find(row => row.slot === slot)} />;
      })}
    </div> : <p className="hint">{forecast?.plannedServices ? "Aucun service simulé aujourd’hui." : forecast ? "Détail par service indisponible." : "Prévision du jour indisponible."}</p>}
  </section>;
}

export function WorkshopPurchases({ purchases, canManage }: { purchases: WorkshopControl["purchases"]; canManage: boolean }) {
  return <section className="panel" aria-labelledby="workshop-purchases">
    <div className="workshop-heading">
      <h2 id="workshop-purchases">Achats et livraisons</h2>
    </div>
    <details className="workshop-details">
      <summary><span>Suggestions à revoir</span><span className="row-count">{purchases.suggestions.length}</span></summary>
      {purchases.suggestions.length ? <ul className="workshop-rows" role="list">
        {purchases.suggestions.map(({ name, unit, quantity: value }, index) => <li key={`${name}:${unit}:${index}`}>
          <span>{name}</span><strong>{quantity(value)} {unit}</strong>
        </li>)}
      </ul> : <p className="hint">Aucune suggestion à revoir.</p>}
    </details>
    <details className="workshop-details">
      <summary><span>Articles attendus</span><span className="row-count">{purchases.orders.length}</span></summary>
      {purchases.orders.length ? <ul className="workshop-rows" role="list">
        {purchases.orders.map(row => <li key={`${row.id}:${row.name}:${row.unit}`}>
          <span>{row.name}<small>{row.supplier}{row.expectedDate && ` · Livraison prévue le ${displayDate(row.expectedDate)}`}</small></span>
          <span><strong>{quantity(row.remaining)} {row.unit} à recevoir</strong><small>{quantity(row.ordered)} {row.unit} commandés</small>
            {canManage && <small><a className="workshop-link" href={`/orders?view=orders#order-${encodeURIComponent(row.orderId)}`}>Voir la commande</a></small>}
          </span>
        </li>)}
      </ul> : <p className="hint">Aucune livraison attendue.</p>}
    </details>
    {purchases.followValidated && <details className="workshop-details">
      <summary><span>Réceptions simulées</span><span className="row-count">{purchases.receipts.length}</span></summary>
      {purchases.receipts.length ? <ul className="workshop-rows" role="list">
        {purchases.receipts.map(row => <li key={`${row.id}:${row.name}:${row.unit}`}>
          <span>{row.name}<small>{row.supplier} · {displayDate(row.date)}</small></span>
          <span><strong>{quantity(row.quantity)} {row.unit} reçus</strong>
            {canManage && row.stockMovementId && <small><a className="workshop-link" href={`/stocks?movement=${encodeURIComponent(row.stockMovementId)}`}>Voir le mouvement de stock</a></small>}
          </span>
        </li>)}
      </ul> : <p className="hint">Aucune réception simulée récente.</p>}
    </details>}
    <div className="workshop-actions">
      <a href={purchasePreparationHref} className="workshop-link">Voir les achats dans Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
  </section>;
}
