import { apiRequest } from "../config/api";

export type SourceKind = "pos" | "ticket_ocr" | "geocoding" | "weather" | "events";
export type SourceState = "not_connected" | "ready" | "degraded";

export interface SourceHealth {
  kind: SourceKind;
  state: SourceState;
  lastSuccessAt: string | null;
}

export const getSources = () => apiRequest<{ sources: SourceHealth[] }>("/workspace/sources");
