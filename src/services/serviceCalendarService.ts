import { apiRequest } from "../config/api";
import type { CalendarService, WeeklyService, SaleAllocation } from "../../shared/serviceCalendar";
export const getWeeklyServices = () => apiRequest<WeeklyService[]>("/workspace/services/weekly");
export const saveWeeklyService = (input: Omit<WeeklyService, "revision"> & { expectedRevision: number; open: boolean }) =>
  apiRequest<WeeklyService | null>("/workspace/services/weekly", { method: "PUT", body: JSON.stringify(input) });
export const getServiceCalendar = (from: string, to: string) => apiRequest<CalendarService[]>(`/workspace/services/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export const saveCalendarService = (input: Pick<CalendarService, "serviceDate" | "slot" | "plannedOpen" | "coverage" | "actualCovers" | "note"> & { expectedRevision: number }) =>
  apiRequest<CalendarService>("/workspace/services/calendar", { method: "PUT", body: JSON.stringify(input) });
export const getSaleAllocation = (saleId: string) => apiRequest<SaleAllocation>(`/workspace/sales/${encodeURIComponent(saleId)}/services`);
export const saveSaleAllocation = (saleId: string, input: { lunchQuantity: number; dinnerQuantity: number; expectedRevision: number; expectedSaleRevision: number }) =>
  apiRequest<SaleAllocation>(`/workspace/sales/${encodeURIComponent(saleId)}/services`, { method: "PUT", body: JSON.stringify(input) });
