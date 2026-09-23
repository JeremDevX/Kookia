export function isCurrentPrediction(predictedDate: Date, referenceDate: Date = new Date()): boolean {
  const restaurantToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(referenceDate);
  return predictedDate.toISOString().slice(0, 10) >= restaurantToday;
}
