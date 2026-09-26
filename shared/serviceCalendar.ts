export const serviceSlots = ["lunch", "dinner"] as const;
export type ServiceSlot = typeof serviceSlots[number];
export type SalesCoverage = "missing" | "partial" | "complete";
export interface WeeklyService {
  weekday: number; slot: ServiceSlot; opensAt: string; closesAt: string; revision: number;
}
export interface CalendarService {
  serviceDate: string; slot: ServiceSlot; plannedOpen: boolean;
  opensAt: string | null; closesAt: string | null; exceptional: boolean;
  coverage: SalesCoverage; actualCovers: number | null; note: string; revision: number;
  soldQuantity: number; unallocatedQuantity: number; allocationNeedsReview: boolean; excludedSimulationQuantity: number;
}
export interface SaleAllocation {
  saleId: string; lunchQuantity: number; dinnerQuantity: number; unallocatedQuantity: number;
  revision: number; saleRevision: number; needsReview: boolean;
}
export const serviceSlotLabels: Record<ServiceSlot, string> = { lunch: "Midi", dinner: "Soir" };

export function qualifiedAllocation(sale: { quantity: number; revision: number }, allocation:
  { lunchQuantity: number; dinnerQuantity: number; saleRevision: number } | null) {
  const needsReview = allocation !== null && (allocation.saleRevision !== sale.revision ||
    allocation.lunchQuantity + allocation.dinnerQuantity > sale.quantity);
  const lunchQuantity = allocation && !needsReview ? allocation.lunchQuantity : 0;
  const dinnerQuantity = allocation && !needsReview ? allocation.dinnerQuantity : 0;
  return { lunchQuantity, dinnerQuantity, unallocatedQuantity: sale.quantity - lunchQuantity - dinnerQuantity, needsReview };
}
