import type { ForecastWeatherReference } from "./forecastWeather.js";
import type { SupplierDeliveryHorizon } from "./supplierDelivery.js";

export interface PurchaseSuggestion {
  suggestionKey: string;
  productId: string;
  productName: string;
  supplierName: string;
  unit: string;
  status: "ready" | "needs_stock_count" | "covered" | "unit_mismatch" | "supplier_constraints_missing" | "availability_conflict";
  canAdd: boolean;
  deliveryHorizon: SupplierDeliveryHorizon;
  usableStock: number | null;
  expiredQuantity: number;
  unknownExpiryQuantity: number;
  beforeDeliveryShortage: number;
  shortages: Array<{ date: string; slot?: "lunch" | "dinner"; quantity: number }>;
  expectedQuantity: number;
  conditionalNetNeed: number | null;
  forecastNeed: number;
  countedStock: number | null;
  countDate: string | null;
  netNeed: number | null;
  orderStep: number;
  estimatedQuantity: number | null;
  currentUnitPrice: number;
  estimatedCost: number | null;
  sources: Array<{ saleItemName: string; recipeName: string; recipeVersion: number; quantity: number }>;
  weatherAdjustments: ForecastWeatherReference[];
  reason: string;
  decision: { kind: "added" | "excluded"; operationId: string; quantity: number | null; orderId: string | null } | null;
}

export interface PurchaseSuggestions {
  status: "ready" | "no_data" | "insufficient_history" | "simulation_only";
  provenance: "recorded_sales" | "demo_simulation" | "mixed";
  workspaceMode: "operational" | "demo";
  model: string;
  asOfDate: string;
  forecastDate: string;
  completeServiceDays: number;
  blockers: string[];
  deliveryWarnings: Array<{ code: "opening_days_unknown" | "opening_days_incompatible"; message: string }>;
  suggestions: PurchaseSuggestion[];
  assumptions: string[];
}
