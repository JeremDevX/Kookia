export type ProductStatus = "optimal" | "moderate" | "urgent" | "neutral";
export type Unit = "kg" | "L" | "dz" | "pcs";

export interface StockCountSummary {
  id: string;
  productId: string;
  countedQuantity: number;
  theoreticalQuantity: number;
  delta: number;
  unit: Unit;
  stockRevisionBefore: number;
  stockRevisionAfter: number;
  operationId: string;
  actorId: string;
  countDate: string;
  countedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  availableForProduction?: number | null;
  expiredStock?: number;
  unknownExpiryStock?: number;
  availabilityDate?: string;
  lotStockMismatch?: boolean;
  unit: Unit;
  minThreshold: number;
  supplierId: string;
  pricePerUnit: number;
  revision: number;
  stockRevision: number;
  orderPackQuantity?: number | null;
  latestCount?: StockCountSummary | null;
  lastDelivery?: string;
}
