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
  unit: Unit;
  minThreshold: number;
  supplierId: string;
  pricePerUnit: number;
  revision: number;
  stockRevision: number;
  latestCount?: StockCountSummary | null;
  lastDelivery?: string;
}
