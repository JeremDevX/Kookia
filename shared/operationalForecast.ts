import type { ServiceSlot } from "./serviceCalendar.js";
export interface ForecastItem {
  entryId: string; name: string; saleItemId: string | null; category: string;
  quantity: number | null; observations: number; model: "weekday" | "service" | "seasonal" | "insufficient";
  observedMin: number | null; observedMax: number | null; deviation: number | null;
}
export interface ForecastService {
  date: string; slot: ServiceSlot; plannedOpen: boolean; menuRevision: number; forecastKey: string;
  items: ForecastItem[]; ingredientNeeds: ForecastIngredient[]; blockers: string[];
  mix: Array<{ category: string; portionsPerCover: number; observedCovers: number; services: number }>;
}
export interface ForecastIngredient {
  productId: string; productName: string; unit: string; quantity: number;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
}
export interface OperationalForecast {
  fromDate: string; throughDate: string; asOfDate: string;
  provenance: "recorded_sales" | "demo_simulation" | "mixed";
  services: ForecastService[]; ingredientNeeds: ForecastIngredient[]; blockers: string[];
  assumptions: string[]; excludedServices: number;
}
