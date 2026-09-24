import { apiRequest } from "../config/api";
export interface MenuSuggestion {
  starter: string; main: string; dessert: string; stockOptimizationText: string;
  reclaimedStockKg: number; criticalWindowHours: number; source: "demo";
  status: "draft" | "validated"; revision: number; validatedAt?: string;
}
export interface MenuSurplusOptions {
  available: boolean;
  options: Array<{ productId: string; productName: string; unit: string; countedQuantity: number;
    stockCountId: string; stockRevision: number; countedAt: string }>;
}
export interface MenuIdeasInput {
  operationId: string;
  surplus: Array<{ productId: string; stockCountId: string; expectedStockRevision: number; quantity: number }>;
}
export interface MenuRecipeIdea {
  recipeId: string; recipeName: string; category: "Entrée" | "Plat" | "Dessert"; version: number; effectiveFrom: string;
  status: "feasible" | "not_feasible"; maximumPortions: number | null;
  surplusProducts: Array<{ productId: string; productName: string; quantity: number; unit: string }>;
  blockers: string[]; expiryStatus: "unknown";
}
export interface MenuIdeasResult {
  provenance: "demo_simulation"; asOfDate: string; emptyReason: string | null; ideas: MenuRecipeIdea[]; replayed: boolean;
}
export const getMenuSurplusOptions = () => apiRequest<MenuSurplusOptions>("/workspace/menu/surplus-options");
export const createMenuIdeas = (input: MenuIdeasInput) => apiRequest<MenuIdeasResult>("/workspace/menu/ideas", {
  method: "POST", body: JSON.stringify(input),
});
export const getMenu = () => apiRequest<MenuSuggestion>("/workspace/menu");
export const saveMenu = (menu: MenuSuggestion, validate: boolean) => apiRequest<MenuSuggestion>("/workspace/menu", {
  method: "POST", body: JSON.stringify({ starter: menu.starter, main: menu.main, dessert: menu.dessert, revision: menu.revision, validate }),
});
