import { formatLocalISODate } from "../../utils/date";

export function forecastWeek(now: Date) {
  const from = formatLocalISODate(now);
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { from, to: end.toISOString().slice(0, 10) };
}
