const RESTAURANT_TIME_ZONE = "Europe/Paris";
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatParisDate = (date = new Date()): string => {
  const parts = isoDateFormatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format date in restaurant timezone");
  }

  return `${year}-${month}-${day}`;
};

export const formatParisTime = (date: Date): string => clockFormatter.format(date);
