// ============================================
// Core Types for FoodAI MVP
// ============================================

// Product Status
export type ProductStatus = "optimal" | "moderate" | "urgent" | "neutral";
export type Unit = "kg" | "L" | "dz" | "pcs";

// Supplier
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// Product
export interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: Unit;
  minThreshold: number;
  supplierId: string;
  pricePerUnit: number;
  lastDelivery?: string;
}

// Prediction
export interface PredictionRecommendation {
  action: "buy" | "wait" | "reduce";
  quantity: number;
  reason: string;
}

export interface Prediction {
  id: string;
  productId: string;
  productName: string;
  predictedDate: string; // ISO date
  predictedConsumption: number;
  confidence: number;
  recommendation?: PredictionRecommendation;
}

// Recipe
export interface RecipeIngredient {
  productId: string;
  quantity: number; // amount required per portion/yield
}

export interface Recipe {
  id: string;
  name: string;
  category: "Plat" | "Dessert" | "Entrée";
  prepTime: number; // minutes
  ingredients: RecipeIngredient[];
  lastMade?: string; // ISO date if made recently
}

// Analytics
export interface WasteStats {
  totalWasteKg: number;
  wastePerMealGram: number;
  targetWastePerMealGram: number;
  monthlyTrend: number; // percentage
  savings: number; // Euros
}

export interface AIReliabilityTrend {
  name: string;
  value: number;
}

export interface AIReliability {
  correctPredictions: number; // percentage
  monthlyTrend: AIReliabilityTrend[];
}

export interface WasteEvolutionDay {
  name: string;
  waste: number;
  target: number;
}

export interface SavingsEvolutionMonth {
  month: string;
  amount: number;
}

export interface CriticalProduct {
  name: string;
  accuracy: number;
  avoidedStockout: number;
}

export interface AnalyticsData {
  wasteStats: WasteStats;
  aiReliability: AIReliability;
  wasteEvolution: WasteEvolutionDay[];
  savingsEvolution: SavingsEvolutionMonth[];
  criticalProducts: CriticalProduct[];
}

// Dashboard Activity
export interface DashboardActivity {
  name: string;
  revenue: number;
  reservations: number;
  consumption: number;
}

// ============================================
// Utility Functions
// ============================================

export const getStatusColor = (status: ProductStatus): string => {
  switch (status) {
    case "urgent":
      return "var(--color-urgent)";
    case "moderate":
      return "var(--color-moderate)";
    case "optimal":
      return "var(--color-optimal)";
    default:
      return "var(--color-text-secondary)";
  }
};

export const getProductStatus = (product: Product): ProductStatus => {
  if (product.currentStock <= product.minThreshold * 0.7) return "urgent";
  if (product.currentStock <= product.minThreshold) return "moderate";
  return "optimal";
};

// Toast
export type ToastType = "success" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}
