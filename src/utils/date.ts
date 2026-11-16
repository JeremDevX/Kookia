const RESTAURANT_TIME_ZONE = "Europe/Paris";
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const formatLocalISODate = (date = new Date()): string => {
  const parts = isoDateFormatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format date in restaurant timezone");
  }

  return `${year}-${month}-${day}`;
};

export const isValidISODate = (value: string | null): value is string => {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
};

export function shiftDays(date: string, days: number): string {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function startOfWeek(date: string): string {
  return shiftDays(date, -((new Date(date).getUTCDay() + 6) % 7));
}
