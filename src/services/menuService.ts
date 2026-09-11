import { apiRequest } from "../config/api";
export interface MenuSuggestion {
  starter: string; main: string; dessert: string; stockOptimizationText: string;
  reclaimedStockKg: number; criticalWindowHours: number; source: "demo";
  status: "draft" | "validated"; revision: number; validatedAt?: string;
}
export const getMenu = () => apiRequest<MenuSuggestion>("/workspace/menu");
export const saveMenu = (menu: MenuSuggestion, validate: boolean) => apiRequest<MenuSuggestion>("/workspace/menu", {
  method: "POST", body: JSON.stringify({ starter: menu.starter, main: menu.main, dessert: menu.dessert, revision: menu.revision, validate }),
});
