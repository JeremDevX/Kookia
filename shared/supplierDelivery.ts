export interface SupplierDeliveryConstraints {
  deliveryWeekdays?: number[];
  leadTimeDays?: number | null;
  orderCutoffTime?: string | null;
}

export type SupplierDeliveryHorizon =
  | { status: "unknown"; code: "supplier_constraints_missing" | "opening_days_incompatible"; reason: string }
  | { status: "known"; orderDate: string; nextDeliveryDate: string; followingDeliveryDate: string; throughDate: string; openingDays: "known" | "unknown"; timeZone: "Europe/Paris" };

export const addCalendarDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export function supplierDeliveryHorizon(constraints: SupplierDeliveryConstraints, now: Date, openingWeekdays?: unknown): SupplierDeliveryHorizon {
  const { deliveryWeekdays: weekdays, leadTimeDays: lead, orderCutoffTime: cutoff } = constraints;
  if (!weekdays?.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      lead == null || !Number.isInteger(lead) || lead < 0 || lead > 60 || !cutoff || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff)) {
    return { status: "unknown", code: "supplier_constraints_missing", reason: "Renseignez les jours de livraison, le délai et l’heure limite du fournisseur (Europe/Paris)." };
  }
  const openingKnown = Array.isArray(openingWeekdays) && openingWeekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
  const compatibleDays = openingKnown ? weekdays.filter(day => openingWeekdays.includes(day)) : weekdays;
  if (openingKnown && compatibleDays.length === 0) {
    return { status: "unknown", code: "opening_days_incompatible", reason: "Aucun jour de livraison du fournisseur ne correspond aux jours d’ouverture du restaurant." };
  }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find((entry) => entry.type === name)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const orderDate = `${part("hour")}:${part("minute")}` >= cutoff ? addCalendarDays(today, 1) : today;
  const eligible = addCalendarDays(orderDate, lead);
  const deliveries: string[] = [];
  for (let offset = 0; offset < 15 && deliveries.length < 2; offset++) {
    const date = addCalendarDays(eligible, offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (compatibleDays.includes(weekday)) deliveries.push(date);
  }
  return { status: "known", orderDate, nextDeliveryDate: deliveries[0], followingDeliveryDate: deliveries[1],
    throughDate: addCalendarDays(deliveries[1], -1), openingDays: openingKnown ? "known" : "unknown", timeZone: "Europe/Paris" };
}
