import { apiRequest } from "../config/api";

export interface InventoryLine {
  productId: string; name: string; category: string; unit: string; stockRevision: number; theoreticalQuantity: number;
  countedQuantity: number | null; reason: string; available?: boolean; previousCount?: { quantity: number; unit: string; reason: string };
}
export interface InventorySession { id: string; revision: number; status: "draft" | "validated"; lines: InventoryLine[]; }
export const getInventory = () => apiRequest<InventorySession | null>("/workspace/inventory-session");
export const openInventory = () => apiRequest<InventorySession>("/workspace/inventory-session", { method: "POST" });
export const saveInventory = (session: InventorySession) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}`, {
  method: "PUT", body: JSON.stringify({ revision: session.revision, lines: session.lines.map(({ productId, countedQuantity, reason }) => ({ productId, countedQuantity, reason })) }),
});
export const validateInventory = (session: Pick<InventorySession, "id" | "revision">) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/validate`, {
  method: "POST", body: JSON.stringify({ revision: session.revision }),
});

export const refreshInventory = (session: InventorySession) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/refresh`, {
  method: "POST", body: JSON.stringify({ revision: session.revision }),
});

export const discardInventory = (session: InventorySession) => apiRequest<void>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/discard`, {
  method: "POST", body: JSON.stringify({ revision: session.revision }),
});
