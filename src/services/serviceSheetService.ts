import { apiRequest } from "../config/api";
import type { ServiceSlot } from "../../shared/serviceCalendar";
import type { SheetInput } from "../../shared/serviceOperations";
import type { ServiceSheet } from "../../shared/serviceSheet";
export const getServiceSheet = (date: string, slot: ServiceSlot) =>
  apiRequest<ServiceSheet>(`/workspace/services/sheet?date=${encodeURIComponent(date)}&slot=${slot}`);
export const saveServiceSheet = (input: SheetInput) => apiRequest<ServiceSheet>("/workspace/services/sheet", { method: "POST", body: JSON.stringify(input) });
