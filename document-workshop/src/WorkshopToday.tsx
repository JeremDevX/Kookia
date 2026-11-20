import { purchasePreparationHref } from "../../src/features/orders/orderNavigation";
import { CalendarDays, ShoppingCart } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import type { WorkshopForecast } from "../../shared/workshopForecast";
import { displayDate, weekday } from "./calendar";
import { quantity, serviceLabel, displayedTime } from "./workshopPresentation";

const terraceStatus = { open: "Ouverte", closed: "Fermée", none: "Sans terrasse", unknown: "Non renseignée" };

function ServicePreview({ slot, planned, hours, weather }: {
  slot: keyof typeof serviceLabel;
  planned?: NonNullable<WorkshopForecast["plannedServices"]>[number];
  hours?: { opensAt: string; closesAt: string };
  weather?: NonNullable<WorkshopForecast["serviceWeather"]>[number];
}) {
  return <article className="workshop-service">
    <div className="workshop-heading"><h3>{serviceLabel[slot]}</h3>{hours && <p className="hint">{hours.opensAt}–{hours.closesAt}</p>}</div>
    <dl className="workshop-facts">
      <div><dt>Référence avant météo</dt><dd>{planned ? `${quantity(planned.baselineCovers)} couverts` : "Indisponible"}</dd></div>
      <div><dt>Couverts prévus</dt><dd>{planned ? quantity(planned.forecastCovers) : "Indisponibles"}</dd></div>
      <div><dt>Terrasse simulée</dt><dd>{weather ? terraceStatus[weather.terrace] : "Non estimée"}</dd></div>
      <div><dt>Préparations prévues</dt><dd>{planned ? `${quantity(planned.plannedPortions)} portions` : "Indisponibles"}</dd></div>
    </dl>
    {weather
      ? <p className="hint">{weather.fetchedAt ? <>Open-Meteo · relevé du {displayedTime(weather.fetchedAt)}. </> : "Aucun relevé météo utilisable. "}{weather.reason}</p>
      : <p className="hint">Aucun relevé météo disponible pour ce service.</p>}
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
  return <section className="panel workshop-structured" aria-labelledby="workshop-today">
    <div className="workshop-heading">
      <h2 id="workshop-today" className="section-heading"><span className="section-icon"><CalendarDays size={18} aria-hidden="true" /></span>Aujourd’hui</h2>
      <time dateTime={date}>{displayDate(date)}</time>
    </div>
    {forecast
      ? <p className="hint">Prévision simulée à partir de la clôture du {displayDate(forecast.basedOnDate)}. <strong>{quantity(forecast.covers)} couverts prévus</strong> dans la journée.</p>
      : <p className="hint">Prévision du jour indisponible. Vérifiez le dernier transfert.</p>}
    {slots.length ? <div className="workshop-services">
      {slots.map(slot => {
        const planned = forecast?.plannedServices?.find(row => row.slot === slot);
        return <ServicePreview key={slot} slot={slot} planned={planned} hours={planned ?? scheduled.find(row => row.slot === slot)}
          weather={forecast?.serviceWeather?.find(row => row.slot === slot)} />;
      })}
    </div> : forecast && <p className="hint">{forecast.plannedServices ? "Aucun service prévu aujourd’hui." : "Le détail par service est indisponible."}</p>}
  </section>;
}

export function WorkshopPurchases({ purchases }: { purchases: WorkshopControl["purchases"] }) {
  return <section className="panel" aria-labelledby="workshop-purchases">
    <div className="workshop-heading">
      <h2 id="workshop-purchases" className="section-heading"><span className="section-icon"><ShoppingCart size={18} aria-hidden="true" /></span>Achats et livraisons</h2>
      <a href={purchasePreparationHref} className="workshop-link">Ouvrir les achats dans Kookia</a>
    </div>
    <p className="hint">{purchases.followValidated
      ? "Les commandes validées dans Kookia alimentent la simulation des livraisons."
      : "Le suivi des commandes validées n’est pas activé pour ce transfert."}</p>
    <details className="workshop-details">
      <summary>Suggestions d’achat · {purchases.suggestions.length}</summary>
      {purchases.suggestions.length ? <ul className="workshop-rows" role="list">
        {purchases.suggestions.map(({ name, unit, quantity: value }, index) => <li key={`${name}:${unit}:${index}`}>
          <span>{name}</span><strong>{quantity(value)} {unit}</strong>
        </li>)}
      </ul> : <p className="hint">Aucune suggestion disponible.</p>}
    </details>
    <details className="workshop-details">
      <summary>Commandes validées et reliquats · {purchases.orders.length}</summary>
      {purchases.orders.length ? <ul className="workshop-rows" role="list">
        {purchases.orders.map(row => <li key={`${row.id}:${row.name}:${row.unit}`}>
          <span>{row.name}<small>{row.supplier}{row.expectedDate && ` · Livraison prévue le ${displayDate(row.expectedDate)}`}</small></span>
          <span><strong>{quantity(row.remaining)} {row.unit} à recevoir</strong><small>{quantity(row.ordered)} {row.unit} commandés</small>
            <small><a className="workshop-link" href={`/orders?view=orders#order-${encodeURIComponent(row.orderId)}`}>Ouvrir la commande</a></small>
          </span>
        </li>)}
      </ul> : <p className="hint">Aucune commande validée à suivre.</p>}
    </details>
    <details className="workshop-details">
      <summary>Réceptions simulées · {purchases.receipts.length}</summary>
      {purchases.receipts.length ? <ul className="workshop-rows" role="list">
        {purchases.receipts.map(row => <li key={`${row.id}:${row.name}:${row.unit}`}>
          <span>{row.name}<small>{row.supplier} · {displayDate(row.date)}</small></span>
          <span><strong>{quantity(row.quantity)} {row.unit} reçus</strong>
            {row.stockMovementId && <small><a className="workshop-link" href={`/stocks?movement=${encodeURIComponent(row.stockMovementId)}`}>Voir le mouvement de stock</a></small>}
          </span>
        </li>)}
      </ul> : <p className="hint">Aucune réception simulée récente.</p>}
    </details>
  </section>;
}
