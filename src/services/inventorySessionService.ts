import { apiRequest } from "../config/api";

export interface InventoryLine {
  productId: string; name: string; category: string; unit: string; stockRevision: number; theoreticalQuantity: number;
  countedQuantity: number | null; reason: string; available?: boolean; previousCount?: { quantity: number; unit: string; reason: string };
}
export interface InventorySession { id: string; revision: number; status: "draft" | "validated"; lines: InventoryLine[]; }
export const getInventoryWorkspace = () => apiRequest<{ restaurantId: string }>("/workspace/inventory-session/context");
const workspaceHeader = (restaurantId: string) => ({ "X-Expected-Restaurant-Id": restaurantId });
export const getInventory = (restaurantId: string) => apiRequest<InventorySession | null>("/workspace/inventory-session", { headers: workspaceHeader(restaurantId) });
export const openInventory = (restaurantId: string) => apiRequest<InventorySession>("/workspace/inventory-session", { method: "POST", headers: workspaceHeader(restaurantId) });
export const saveInventory = (session: InventorySession, restaurantId: string) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}`, {
  method: "PUT", headers: workspaceHeader(restaurantId), body: JSON.stringify({ revision: session.revision, lines: session.lines.map(({ productId, countedQuantity, reason }) => ({ productId, countedQuantity, reason })) }),
});
export const validateInventory = (session: Pick<InventorySession, "id" | "revision">, restaurantId: string) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/validate`, {
  method: "POST", headers: workspaceHeader(restaurantId), body: JSON.stringify({ revision: session.revision }),
});

export const refreshInventory = (session: InventorySession, restaurantId: string) => apiRequest<InventorySession>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/refresh`, {
  method: "POST", headers: workspaceHeader(restaurantId), body: JSON.stringify({ revision: session.revision }),
});

export const discardInventory = (session: InventorySession, restaurantId: string) => apiRequest<void>(`/workspace/inventory-session/${encodeURIComponent(session.id)}/discard`, {
  method: "POST", headers: workspaceHeader(restaurantId), body: JSON.stringify({ revision: session.revision }),
});
