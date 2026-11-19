import { formatLocalISODate, shiftDays } from "../../utils/date";

export function forecastWeek(now: Date) {
  const from = formatLocalISODate(now);
  return { from, to: shiftDays(from, 6) };
}
