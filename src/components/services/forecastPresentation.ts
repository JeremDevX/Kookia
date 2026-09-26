import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { OperationalForecast } from "../../../shared/operationalForecast";
export function selectedForecastService(forecast: OperationalForecast, date: string, slot: ServiceSlot) {
  return forecast.services.find((service) => service.date === date && service.slot === slot) ?? null;
}
