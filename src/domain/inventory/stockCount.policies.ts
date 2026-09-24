import type { Product } from "./product.types";

export type StockVerificationStatus = "counted" | "to_verify";

export const getStockVerificationStatus = (product: Product): StockVerificationStatus =>
  product.latestCount && product.latestCount.stockRevisionAfter === product.stockRevision ? "counted" : "to_verify";
