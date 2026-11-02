import { Link, useSearchParams } from "react-router-dom";
import type { PurchaseOrder } from "../../services/orderService";
import { formatLocalISODate } from "../../utils/date";
import { dateExceeded, isCalendarAnchor, receiptEventHref, receiptEvents, shiftDays, shiftMonth, startOfWeek } from "../../features/orders/receiptCalendar";
import Button from "../common/Button";
import "./ReceiptCalendar.css";

const displayDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const displayItems = (items: Array<{ name: string; quantity: number; unit: string }>) => items.length
  ? items.map((item) => `${item.name} · ${item.quantity.toLocaleString("fr-FR")} ${item.unit}`).join(" ; ") : "Aucun produit reçu";

export default function ReceiptCalendar({ orders }: { orders: PurchaseOrder[] }) {
  const [params, setParams] = useSearchParams();
  const period = params.get("period") === "month" ? "month" : "week";
  const today = formatLocalISODate(new Date());
  const requestedDate = params.get("receiptDate");
  const anchor = isCalendarAnchor(requestedDate) ? requestedDate : today;
  const supplier = params.get("receiptSupplier") ?? "";
  const requestedStatus = params.get("receiptStatus");
  const status = requestedStatus === "expected" || requestedStatus === "received" || requestedStatus === "exceeded" ? requestedStatus : "all";
  const updateCalendar = (key: string, value: string, replace = true) => {
    const updated = new URLSearchParams(params);
    if (value) updated.set(key, value); else updated.delete(key);
    setParams(updated, { replace });
  };
  const setPeriod = (next: "week" | "month") => updateCalendar("period", next, false);
  const setAnchor = (date: string) => updateCalendar("receiptDate", date);
  const start = period === "week" ? startOfWeek(anchor) : startOfWeek(`${anchor.slice(0, 7)}-01`);
  const days = Array.from({ length: period === "week" ? 7 : 42 }, (_, index) => shiftDays(start, index));
  const suppliers = [...new Map(orders.flatMap((order) => order.lines.map((line) => [line.supplierId, line.supplierName] as const))).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const { events: allEvents, undated } = receiptEvents(orders, supplier);
  const events = allEvents.filter((event) => status === "all" || event.kind === status || status === "exceeded" && dateExceeded(event, today));
  const weekEvents = events.filter((event) => event.date >= days[0] && event.date <= days[6])
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekSummary = allEvents.filter((event) => event.date >= days[0] && event.date <= days[6]);
  const expectedCount = weekSummary.filter((event) => event.kind === "expected" && !dateExceeded(event, today)).length;
  const receivedCount = weekSummary.filter((event) => event.kind === "received").length;
  const exceededCount = weekSummary.filter((event) => dateExceeded(event, today)).length;
  const title = period === "week"
    ? `${displayDate(days[0], { day: "numeric", month: "short" })} – ${displayDate(days[6], { day: "numeric", month: "short", year: "numeric" })}`
    : displayDate(anchor, { month: "long", year: "numeric" });
  const move = (direction: number) => setAnchor(period === "week" ? shiftDays(anchor, direction * 7) : shiftMonth(anchor, direction));

  return <section className="receipt-calendar" aria-label="Calendrier des réceptions">
    <div className="receipt-calendar-tabs" aria-label="Période des réceptions">
      <Button variant="outline" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Semaine</Button>
      <Button variant="outline" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Mois</Button>
    </div>
    <div className="receipt-calendar-controls"><Button variant="outline" onClick={() => setAnchor(today)}>Aujourd’hui</Button>
      <strong aria-live="polite">{title}</strong>
      <div className="receipt-calendar-navigation" role="group" aria-label="Changer de période"><Button variant="outline" aria-label="Période précédente" onClick={() => move(-1)}>‹</Button>
      <Button variant="outline" aria-label="Période suivante" onClick={() => move(1)}>›</Button></div>
      <label>Fournisseur<select value={supplier} onChange={(event) => updateCalendar("receiptSupplier", event.target.value)}><option value="">Tous les fournisseurs</option>{supplier && !suppliers.some(([id]) => id === supplier) && <option value={supplier}>Fournisseur indisponible</option>}{suppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Statut<select value={status} onChange={(event) => updateCalendar("receiptStatus", event.target.value === "all" ? "" : event.target.value)}><option value="all">Tous les statuts</option><option value="expected">À recevoir</option><option value="exceeded">Date prévue dépassée</option><option value="received">Réception enregistrée</option></select></label></div>
    {period === "week" && <div className="receipt-calendar-summary" aria-label="Bilan de la semaine">
      <span className="receipt-calendar-status expected">{expectedCount} à recevoir</span>
      <span className="receipt-calendar-status received">{receivedCount} réception{receivedCount > 1 ? "s" : ""} enregistrée{receivedCount > 1 ? "s" : ""}</span>
      <span className="receipt-calendar-status exceeded">{exceededCount} date{exceededCount > 1 ? "s" : ""} prévue{exceededCount > 1 ? "s" : ""} dépassée{exceededCount > 1 ? "s" : ""}</span>
      {weekSummary.some((event) => event.simulated) && <span>Données de démonstration incluses</span>}
    </div>}
    {status !== "received" && status !== "exceeded" && undated > 0 && <p className="receipt-calendar-note">{undated} ligne{undated > 1 ? "s" : ""} à recevoir sans date prévue : <Link to="/orders?view=orders">consulter les commandes</Link>.</p>}
    {period === "week" ? <div className="receipt-calendar-table-wrap"><table className="receipt-calendar-table">
      <thead><tr><th scope="col">Date</th><th scope="col">Fournisseur ou référence</th><th scope="col">Contenu</th><th scope="col">Statut</th><th scope="col">Action</th></tr></thead>
      <tbody>{weekEvents.map((event, index) => <tr key={`${event.orderId}-${event.kind}-${index}`}>
        <td><time dateTime={event.date}>{displayDate(event.date, { weekday: "short", day: "numeric", month: "short" })}</time></td>
        <th scope="row">{event.label}</th><td>{displayItems(event.items)}</td><td><span className={`receipt-calendar-status ${dateExceeded(event, today) ? "exceeded" : event.kind}`}>{dateExceeded(event, today) ? "Date prévue dépassée" : event.kind === "expected" ? "À recevoir" : "Réception enregistrée"}{event.simulated ? " · simulation" : ""}</span></td>
        <td><Link aria-label={`${event.kind === "expected" ? "Rapprocher la livraison" : "Voir la réception"} : ${event.label}, ${displayDate(event.date, { day: "numeric", month: "long", year: "numeric" })}`} to={receiptEventHref(event)}>{event.kind === "expected" ? "Rapprocher" : "Voir la réception"}</Link></td>
      </tr>)}</tbody>
    </table>{weekEvents.length === 0 && <p className="receipt-calendar-note">Aucune réception datée cette semaine.</p>}</div> : <div className="receipt-calendar-days receipt-calendar-month">
      {days.map((day) => <div key={day} className={day.slice(0, 7) !== anchor.slice(0, 7) ? "receipt-calendar-outside" : undefined}>
        <time dateTime={day} aria-current={day === today ? "date" : undefined}>{displayDate(day, { weekday: "short", day: "numeric" })}</time>
        {events.filter((event) => event.date === day).map((event, index) => <Link key={`${event.orderId}-${event.kind}-${index}`} className={`receipt-calendar-event ${event.kind}`} to={receiptEventHref(event)}>
          {event.label} · {dateExceeded(event, today) ? "Date prévue dépassée" : event.kind === "expected" ? "prévu" : "reçu"}{event.simulated ? " · simulation" : ""}</Link>)}
      </div>)}
    </div>}
  </section>;
}
