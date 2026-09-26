export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryWeekdays?: number[];
  leadTimeDays?: number | null;
  orderCutoffTime?: string | null;
}
