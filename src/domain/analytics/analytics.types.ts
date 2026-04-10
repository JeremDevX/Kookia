export interface WasteStats {
  totalWasteKg: number;
  wastePerMealGram: number;
  targetWastePerMealGram: number;
  monthlyTrend: number;
  savings: number;
}

export interface AIReliabilityTrend {
  name: string;
  value: number;
}

export interface AIReliability {
  correctPredictions: number;
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

export interface DashboardActivity {
  name: string;
  revenue: number;
  reservations: number;
  consumption: number;
}
