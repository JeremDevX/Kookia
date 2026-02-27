// ============================================
// Callback and Form Types for Components
// ============================================

import type { Unit } from "./index";

/**
 * Analytics customization settings
 */
export interface AnalyticsSettings {
  wasteTarget: string;
  showTrends: boolean;
  showAI: boolean;
  showROI: boolean;
  alertThreshold: string;
}

/**
 * Stock filter options
 */
export interface StockFilters {
  status: "all" | "optimal" | "moderate" | "urgent";
  supplier: string;
  stockLevel: "all" | "low" | "medium" | "high";
}

/**
 * Production record data
 */
export interface ProductionRecord {
  recipeName: string;
  portions: string;
  prepTime: string;
  notes: string;
  date: string;
}

/**
 * New product form data
 */
export interface NewProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: Unit;
  minThreshold: number;
  supplierId: string;
  pricePerUnit: number;
}
