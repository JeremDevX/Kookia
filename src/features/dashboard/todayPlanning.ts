import type { CalendarService } from "../../../shared/serviceCalendar";
import { receiptEvents } from "../orders/receiptCalendar";
import type { PurchaseOrder } from "../../services/orderService";

export function serviceSchedule(service: CalendarService): string {
  if (!service.plannedOpen) return service.exceptional ? "Fermé pour ce service" : "Horaires non renseignés";
  return service.opensAt && service.closesAt ? `${service.opensAt} – ${service.closesAt}` : "Ouvert, horaires non renseignés";
}

export function todayReceipts(orders: PurchaseOrder[], today: string) {
  const { events, undated } = receiptEvents(orders);
  const simulatedUndated = receiptEvents(orders.filter((order) => order.status.startsWith("simulated"))).undated;
  return { events: events.filter((event) => event.date === today), undated, simulatedUndated };
}
