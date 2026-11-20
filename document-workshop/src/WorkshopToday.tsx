import { ArrowUpRight, CalendarDays, CloudSun, Clock3 } from "lucide-react";
import { purchasePreparationHref } from "../../src/features/orders/orderNavigation";
import { formatParisTime } from "../../shared/parisDate";
import type { WorkshopControl } from "../../shared/workshopControl";
import type { WorkshopForecast } from "../../shared/workshopForecast";
import { displayDate, weekday } from "./calendar";
import { quantity, serviceLabel } from "./workshopPresentation";

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
      {hours && <p className="control-service-hours"><Clock3 size={14} aria-hidden="true" /> <time>{hours.opensAt}</time>–<time>{hours.closesAt}</time></p>}
    </header>
    {planned ? <>
      <p className="service-total"><strong>{quantity(planned.forecastCovers)}</strong> couverts prévus</p>
      <dl className="service-facts">
        <div><dt>À préparer</dt><dd>{quantity(planned.plannedPortions)} portions</dd></div>
        <div><dt>Avant météo</dt><dd>{quantity(planned.baselineCovers)} couverts</dd></div>
      </dl>
    </> : <p className="hint">Prévision par service indisponible.</p>}
    {weather ? <footer className="service-weather">
      <p><strong>{terraceStatus[weather.terrace]}</strong>
        {weatherEffect && <span className="weather-effect">Effet météo {weatherEffect}</span>}</p>
      <p className="hint">{weather.reason}</p>
      {weather.fetchedAt && <p className="workshop-muted">
        Open-Meteo · <time dateTime={weather.fetchedAt}>actualisé à {formatParisTime(new Date(weather.fetchedAt))}</time>
      </p>}
    </footer> : planned && <footer className="service-weather">
      <p className="hint">Météo et terrasse non estimées.</p>
    </footer>}
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
      <h2 id="workshop-today">Prévisions du jour</h2>
      <p className="workshop-muted control-today-date"><CalendarDays size={16} aria-hidden="true" /> <time dateTime={date}>{displayDate(date)}</time></p>
    </div>
    {forecast && <div className="control-forecast-context">
      {(!forecast.plannedServices || slots.length > 1) && <p><strong>{quantity(forecast.covers)}</strong> couverts au total</p>}
      <p className="hint">Simulation d’après la clôture du <time dateTime={forecast.basedOnDate}>{displayDate(forecast.basedOnDate)}</time>.</p>
    </div>}
    {forecast && slots.length > 0 ? <div className="workshop-services">
      {slots.map(slot => {
        const planned = forecast.plannedServices?.find(row => row.slot === slot);
        return <ServicePreview key={slot} slot={slot} planned={planned} hours={planned ?? scheduled.find(row => row.slot === slot)}
          weather={forecast.serviceWeather?.find(row => row.slot === slot)} />;
      })}
    </div> : <div className="control-empty">
      <CloudSun size={20} aria-hidden="true" />
      <div>
        <p><strong>{forecast?.plannedServices ? "Aucun service simulé aujourd’hui." : forecast ? "Détail par service indisponible." : "Prévision du jour indisponible."}</strong></p>
        {!forecast && scheduled.length > 0 && <ul className="workshop-rows" aria-label="Horaires habituels">
          {scheduled.map(service => <li key={service.slot}><span>{serviceLabel[service.slot]}</span><span>{service.opensAt}–{service.closesAt}</span></li>)}
        </ul>}
      </div>
    </div>}
  </section>;
}

export function WorkshopPurchases({ purchases, canManage, mode }: {
  purchases: WorkshopControl["purchases"];
  canManage: boolean;
  mode: WorkshopControl["restaurant"]["mode"];
}) {
  const { suggestions, orders, receipts, followValidated } = purchases;
  const hasPurchases = suggestions.length > 0 || orders.length > 0 || receipts.length > 0;

  return <section className="panel workshop-purchases" aria-labelledby="workshop-purchases">
    <div className="workshop-heading">
      <h2 id="workshop-purchases">Achats et livraisons</h2>
    </div>
    {!hasPurchases && <p className="control-empty-copy">{mode === "demo" && !followValidated
      ? "Le suivi des commandes est désactivé dans cet espace de test."
      : followValidated ? "Aucune suggestion, livraison ou réception à afficher." : "Aucune suggestion ni livraison à suivre."}</p>}
    {suggestions.length > 0 && <details className="workshop-details">
      <summary><span>Suggestions à revoir</span><span className="row-count">{suggestions.length}</span></summary>
      <ul className="workshop-rows" role="list">
        {suggestions.map(({ name, unit, quantity: value }, index) => <li key={`${name}:${unit}:${index}`}>
          <span>{name}</span><strong>{quantity(value)} {unit}</strong>
        </li>)}
      </ul>
    </details>}
    {orders.length > 0 && <details className="workshop-details">
      <summary><span>Articles à recevoir</span><span className="row-count">{orders.length}</span></summary>
      <ul className="workshop-rows control-deliveries" role="list">
        {orders.map(row => <li key={row.id}>
          <span><strong>{row.name}</strong><small>{row.supplier}</small>
            <small>{row.expectedDate ? <>Prévu le <time dateTime={row.expectedDate}>{displayDate(row.expectedDate)}</time></> : "Date de livraison non renseignée"}</small>
          </span>
          <span><strong>{quantity(row.remaining)} {row.unit} à recevoir</strong><small>{quantity(row.ordered)} {row.unit} commandés</small>
            {canManage && <small><a className="workshop-link" href={`/orders?view=orders#order-${encodeURIComponent(row.orderId)}`}>Voir la commande</a></small>}
          </span>
        </li>)}
      </ul>
    </details>}
    {followValidated && receipts.length > 0 && <details className="workshop-details">
      <summary><span>Réceptions simulées</span><span className="row-count">{receipts.length}</span></summary>
      <ul className="workshop-rows control-deliveries" role="list">
        {receipts.map(row => <li key={row.id}>
          <span><strong>{row.name}</strong><small>{row.supplier} · <time dateTime={row.date}>{displayDate(row.date)}</time></small></span>
          <span><strong>{quantity(row.quantity)} {row.unit} reçus</strong>
            {canManage && row.stockMovementId && <small><a className="workshop-link" href={`/stocks?movement=${encodeURIComponent(row.stockMovementId)}`}>Voir le mouvement de stock</a></small>}
          </span>
        </li>)}
      </ul>
    </details>}
    <div className="workshop-actions">
      <a href={purchasePreparationHref} className="workshop-link">Revoir les achats dans Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
  </section>;
}
