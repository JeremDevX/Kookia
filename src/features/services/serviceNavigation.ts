import type { ServiceSlot } from "../../../shared/serviceCalendar";
import { isValidISODate } from "../../utils/date";

export interface ServiceContext { date: string; slot: ServiceSlot; }
export function readServiceContext(params: URLSearchParams): ServiceContext | null {
  const date = params.get("serviceDate"), slot = params.get("serviceSlot");
  return isValidISODate(date) && (slot === "lunch" || slot === "dinner") ? { date, slot } : null;
}
export function serviceContextHref(path: "/services" | "/settings", context: ServiceContext) {
  return `${path}?${new URLSearchParams({ serviceDate: context.date, serviceSlot: context.slot })}`;
}
export function weatherServiceContext(pathname: string, params: URLSearchParams, today: string, slot: ServiceSlot): ServiceContext {
  return pathname === "/services" ? readServiceContext(params) ?? { date: today, slot: "lunch" } : { date: today, slot };
}
