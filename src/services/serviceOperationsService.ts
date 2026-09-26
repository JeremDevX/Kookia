import { apiRequest } from "../config/api";
import type { MenuInput, ServiceMenu, IncidentInput } from "../../shared/serviceOperations";
import type { ServiceSlot } from "../../shared/serviceCalendar";
import type { OperationalForecast } from "../../shared/operationalForecast";
export const getServiceMenu = (date: string, slot: ServiceSlot) => apiRequest<ServiceMenu>(`/workspace/service-menu?date=${date}&slot=${slot}`);
export const getMenuHistory = (date: string, slot: ServiceSlot) => apiRequest<ServiceMenu[]>(`/workspace/service-menu/history?date=${date}&slot=${slot}`);
export const saveServiceMenu = (input: MenuInput) => apiRequest<ServiceMenu>("/workspace/service-menu", { method: "POST", body: JSON.stringify(input) });
export const getOperationalForecast = (from: string, to: string) => apiRequest<OperationalForecast>(`/workspace/service-forecast?from=${from}&to=${to}`);
export interface OperationalIncident extends Omit<IncidentInput, "operationId"> {
  id: string; status: "open" | "resolved"; revision: number; actionNote: string | null;
  createdAt: string; resolvedAt: string | null; consequences: string[]; suggestions: string[];
}
export const getIncidents = (from: string, to: string) => apiRequest<OperationalIncident[]>(`/workspace/service-incidents?from=${from}&to=${to}`);
export const recordIncident = (input: IncidentInput) => apiRequest<OperationalIncident>("/workspace/service-incidents", { method: "POST", body: JSON.stringify(input) });
export const resolveIncident = (id: string, expectedRevision: number, actionNote: string, operationId: string) => apiRequest<OperationalIncident>(`/workspace/service-incidents/${id}/resolve`, {
  method: "POST", body: JSON.stringify({ expectedRevision, actionNote, operationId }),
});
export const getIncidentLots = () => apiRequest<{ lots: Array<{ id: string; productId: string; receivedAt: string | null; expiresAt: string | null; remainingQuantity: number }> }>("/workspace/stock-lots");
