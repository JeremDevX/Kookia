import { formatLocalISODate } from "../utils/date";

export function watchTimelineToday(setToday: (today: string) => void) {
  const updateToday = () => setToday(formatLocalISODate(new Date()));
  const interval = window.setInterval(updateToday, 60_000);
  document.addEventListener("visibilitychange", updateToday);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", updateToday);
  };
}
