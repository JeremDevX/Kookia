import { useState } from "react";
import { Link } from "react-router-dom";
import type { PurchaseOrder } from "../../services/orderService";
import { formatLocalISODate } from "../../utils/date";
import { receiptEvents, shiftDays, shiftMonth, startOfWeek } from "../../features/orders/receiptCalendar";
import Button from "../common/Button";
import "./ReceiptCalendar.css";

const displayDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

export default function ReceiptCalendar({ orders }: { orders: PurchaseOrder[] }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => formatLocalISODate(new Date()));
  const today = formatLocalISODate(new Date());
  const start = period === "week" ? startOfWeek(anchor) : startOfWeek(`${anchor.slice(0, 7)}-01`);
  const days = Array.from({ length: period === "week" ? 7 : 42 }, (_, index) => shiftDays(start, index));
  const { events, undated } = receiptEvents(orders);
  const weekEvents = events.filter((event) => event.date >= days[0] && event.date <= days[6])
    .sort((a, b) => a.date.localeCompare(b.date));
  const title = period === "week"
    ? `${displayDate(days[0], { day: "numeric", month: "short" })} – ${displayDate(days[6], { day: "numeric", month: "short", year: "numeric" })}`
    : displayDate(anchor, { month: "long", year: "numeric" });
  const move = (direction: number) => setAnchor(period === "week" ? shiftDays(anchor, direction * 7) : shiftMonth(anchor, direction));

  return <section className="receipt-calendar" aria-labelledby="receipt-calendar-title">
    <div className="receipt-calendar-heading"><div><h2 id="receipt-calendar-title">Réceptions fournisseurs</h2>
      <p>Consultez les dates prévues et les réceptions enregistrées.</p></div></div>
    <div className="receipt-calendar-tabs" aria-label="Période des réceptions">
      <Button variant="outline" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Semaine</Button>
      <Button variant="outline" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Mois</Button>
    </div>
    <div className="receipt-calendar-controls"><Button variant="outline" onClick={() => setAnchor(today)}>Aujourd’hui</Button>
      <strong aria-live="polite">{title}</strong>
      <Button variant="outline" aria-label="Période précédente" onClick={() => move(-1)}>‹</Button>
      <Button variant="outline" aria-label="Période suivante" onClick={() => move(1)}>›</Button></div>
    {undated > 0 && <p className="receipt-calendar-note">{undated} ligne{undated > 1 ? "s" : ""} à recevoir sans date prévue : consultez les commandes ci-dessous.</p>}
    {period === "week" ? <div className="receipt-calendar-table-wrap"><table className="receipt-calendar-table">
      <thead><tr><th scope="col">Date</th><th scope="col">Fournisseur ou référence</th><th scope="col">Statut</th><th scope="col">Action</th></tr></thead>
      <tbody>{weekEvents.map((event, index) => <tr key={`${event.orderId}-${event.kind}-${index}`}>
        <td><time dateTime={event.date}>{displayDate(event.date, { weekday: "short", day: "numeric", month: "short" })}</time></td>
        <th scope="row">{event.label}</th><td><span className={`receipt-calendar-status ${event.kind}`}>{event.kind === "expected" ? "À recevoir" : "Réception enregistrée"}{event.simulated ? " · simulation" : ""}</span></td>
        <td><Link aria-label={`Voir la commande : ${event.label}, ${displayDate(event.date, { day: "numeric", month: "long", year: "numeric" })}`} to={`/orders?view=orders#order-${encodeURIComponent(event.orderId)}`}>Voir la commande</Link></td>
      </tr>)}</tbody>
    </table>{weekEvents.length === 0 && <p className="receipt-calendar-note">Aucune réception datée cette semaine.</p>}</div> : <div className="receipt-calendar-days receipt-calendar-month">
      {days.map((day) => <div key={day} className={day.slice(0, 7) !== anchor.slice(0, 7) ? "receipt-calendar-outside" : undefined}>
        <time dateTime={day} aria-current={day === today ? "date" : undefined}>{displayDate(day, { weekday: "short", day: "numeric" })}</time>
        {events.filter((event) => event.date === day).map((event, index) => <Link key={`${event.orderId}-${event.kind}-${index}`} className={`receipt-calendar-event ${event.kind}`} to={`/orders?view=orders#order-${encodeURIComponent(event.orderId)}`}>
          {event.label} · {event.kind === "expected" ? "prévu" : "reçu"}{event.simulated ? " · simulation" : ""}</Link>)}
      </div>)}
    </div>}
  </section>;
}
