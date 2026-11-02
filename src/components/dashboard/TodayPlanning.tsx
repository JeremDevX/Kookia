import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CalendarService } from "../../../shared/serviceCalendar";
import { serviceSlotLabels } from "../../../shared/serviceCalendar";
import { dateExceeded, receiptEventHref } from "../../features/orders/receiptCalendar";
import { serviceContextHref } from "../../features/services/serviceNavigation";
import { serviceSchedule, todayReceipts } from "../../features/dashboard/todayPlanning";
import { getOrders, type PurchaseOrder } from "../../services/orderService";
import { getServiceCalendar } from "../../services/serviceCalendarService";
import { formatLocalISODate } from "../../utils/date";
import Button from "../common/Button";
import "./TodayPlanning.css";

export default function TodayPlanning() {
  const [today, setToday] = useState(() => formatLocalISODate(new Date()));
  const todayRef = useRef(today);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [services, setServices] = useState<CalendarService[] | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [serviceError, setServiceError] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [serviceAttempt, setServiceAttempt] = useState(0);
  const [orderAttempt, setOrderAttempt] = useState(0);
  useEffect(() => {
    const clear = () => { setServices(null); setOrders(null); setServiceError(false); setOrderError(false); };
    const updateDate = () => {
      const next = formatLocalISODate(new Date());
      if (next !== todayRef.current) { todayRef.current = next; clear(); setToday(next); }
    };
    const returnToPage = () => {
      if (document.visibilityState !== "visible") return;
      updateDate(); clear(); setServiceAttempt((value) => value + 1); setOrderAttempt((value) => value + 1);
    };
    let timer: number;
    const schedule = () => { timer = window.setTimeout(() => { updateDate(); schedule(); }, 60_000 - Date.now() % 60_000); };
    schedule();
    document.addEventListener("visibilitychange", returnToPage);
    window.addEventListener("focus", returnToPage);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", returnToPage); window.removeEventListener("focus", returnToPage); };
  }, []);
  useEffect(() => {
    let active = true;
    getServiceCalendar(today, today).then((result) => { if (active) setServices(result); }, () => { if (active) setServiceError(true); });
    return () => { active = false; };
  }, [today, serviceAttempt]);
  useEffect(() => {
    let active = true;
    getOrders().then((result) => { if (active) setOrders(result); }, () => { if (active) setOrderError(true); });
    return () => { active = false; };
  }, [today, orderAttempt]);
  const receipts = orders && todayReceipts(orders, today);
  return <div className="dashboard-container today-planning">
    <header className="dashboard-header"><div><Link to="/">← Retour au tableau de bord</Link><h1 ref={heading} tabIndex={-1}>Planning du jour</h1>
      <time dateTime={today}>{new Date(`${today}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time></div></header>
    <div className="today-planning-grid">
      <section className="today-card" aria-labelledby="planning-services"><h2 id="planning-services">Services</h2>
        {serviceError ? <div role="alert"><p>Les horaires sont indisponibles.</p><Button variant="outline" onClick={() => { setServices(null); setServiceError(false); setServiceAttempt((value) => value + 1); }}>Réessayer</Button></div>
          : !services ? <p role="status">Chargement des horaires…</p> : <ul className="today-planning-list">{services.map((service) => <li key={service.slot}>
            <div><strong>{serviceSlotLabels[service.slot]}</strong><p>{serviceSchedule(service)}</p></div>
            {service.plannedOpen && <Link to={serviceContextHref("/services", { date: today, slot: service.slot })}>Voir le service {serviceSlotLabels[service.slot].toLowerCase()}</Link>}
          </li>)}</ul>}
        <p className="today-planning-links"><Link to="/settings">Renseigner les horaires</Link> · <Link to="/sales#dated-service-title">Modifier un service</Link></p>
      </section>
      <section className="today-card" aria-labelledby="planning-receipts"><h2 id="planning-receipts">Livraisons et réceptions</h2>
        {orderError ? <div role="alert"><p>Les réceptions sont indisponibles.</p><Button variant="outline" onClick={() => { setOrders(null); setOrderError(false); setOrderAttempt((value) => value + 1); }}>Réessayer</Button></div>
          : !receipts ? <p role="status">Chargement des réceptions…</p> : <>
            {receipts.events.length === 0 ? <p>Aucune livraison ou réception datée aujourd’hui.</p> : <ul className="today-planning-list">{receipts.events.map((event, index) => <li key={`${event.orderId}-${event.kind}-${index}`}>
              <div><strong>{event.label}</strong><p>{dateExceeded(event, today) ? `Date prévue dépassée : ${new Date(`${event.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}` : event.kind === "expected" ? "Livraison attendue" : "Réception enregistrée"}{event.simulated ? " · simulation" : ""}</p>
                {event.items.length > 0 && <p>{event.items.map((item) => `${item.name} · ${item.quantity.toLocaleString("fr-FR")} ${item.unit}`).join(" ; ")}</p>}</div>
              <Link to={receiptEventHref(event)}>{event.kind === "expected" ? "Rapprocher la livraison" : "Voir la réception"}</Link>
            </li>)}</ul>}
            {receipts.undated > 0 && <p>{receipts.undated} ligne{receipts.undated > 1 ? "s" : ""} attendue{receipts.undated > 1 ? "s" : ""} sans date de livraison{receipts.simulatedUndated > 0 && `, dont ${receipts.simulatedUndated} en simulation`}.</p>}
          </>}
        <p className="today-planning-links"><Link to="/orders?view=receipts">Voir les réceptions</Link></p>
      </section>
    </div>
  </div>;
}
