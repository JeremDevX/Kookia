const RESTAURANT_TIME_ZONE = "Europe/Paris";
const DAY_IN_MS = 86_400_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const formatLocalISODate = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format date in restaurant timezone");
  }

  return `${year}-${month}-${day}`;
};

const getEpochDayFromISODate = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid ISO date format, expected YYYY-MM-DD");
  }

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
};

const toRestaurantISODate = (dateValue: string): string => {
  if (ISO_DATE_PATTERN.test(dateValue)) {
    return dateValue;
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date value");
  }

  return formatLocalISODate(parsedDate);
};

export const getBusinessDaysUntilDate = (
  targetDate: string,
  referenceDate: Date = new Date()
): number => {
  const restaurantTodayISO = formatLocalISODate(referenceDate);
  const restaurantTargetISO = toRestaurantISODate(targetDate);

  return (
    getEpochDayFromISODate(restaurantTargetISO) -
    getEpochDayFromISODate(restaurantTodayISO)
  );
};

export const isOnOrAfterRestaurantToday = (
  targetDate: string,
  referenceDate: Date = new Date()
): boolean => getBusinessDaysUntilDate(targetDate, referenceDate) >= 0;
