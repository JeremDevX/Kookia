export type ProductStatus = "optimal" | "moderate" | "urgent" | "neutral";
export type Unit = "kg" | "L" | "dz" | "pcs";

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
