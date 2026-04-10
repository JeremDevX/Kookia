export type {
  Product,
  ProductStatus,
  Unit,
} from "../domain/inventory/product.types";
export type { Supplier } from "../domain/inventory/supplier.types";
export {
  getProductStatus,
  getStatusColor,
} from "../domain/inventory/product.policies";

export type {
  Prediction,
  PredictionPriority,
  PredictionRecommendation,
} from "../domain/predictions/prediction.types";

export type { Recipe, RecipeIngredient } from "../domain/recipes/recipe.types";

export type {
  AIReliability,
  AIReliabilityTrend,
  AnalyticsData,
  CriticalProduct,
  DashboardActivity,
  SavingsEvolutionMonth,
  WasteEvolutionDay,
  WasteStats,
} from "../domain/analytics/analytics.types";

export type { Toast, ToastType } from "../shared/ui/toast/toast.types";
