import { addCalendarDays } from "../../shared/calendarDate";

export { addCalendarDays as shiftDays } from "../../shared/calendarDate";
export { formatParisDate as formatLocalISODate } from "../../shared/parisDate";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidISODate = (value: string | null): value is string => {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
};

export function startOfWeek(date: string): string {
  return addCalendarDays(date, -((new Date(date).getUTCDay() + 6) % 7));
}
