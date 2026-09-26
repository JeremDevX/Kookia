import type { ForecastIngredient, ForecastItem } from "../../../../shared/operationalForecast.js";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";

export interface ServiceObservation { date: string; slot: ServiceSlot; saleItemId: string; quantity: number; }
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const month = (date: string) => Number(date.slice(5, 7));
const round = (n: number) => Math.round(n * 1000) / 1000;
export function forecastMenuEntry(entry: MenuEntry, date: string, slot: ServiceSlot, history: ServiceObservation[]): ForecastItem {
  const base = { entryId: entry.id, name: entry.name, saleItemId: entry.saleItemId, category: entry.category };
  const eligible = history.filter(h => h.slot === slot && h.saleItemId === entry.saleItemId && h.date < date);
  const matchingWeekdays = eligible.filter(h => weekday(h.date) === weekday(date));
  const seasonal = matchingWeekdays.filter(h => {
    const distance = Math.abs(month(h.date) - month(date));
    return Math.min(distance, 12 - distance) <= 1;
  });
  const seasonalYears = new Set(seasonal.map(h => h.date.slice(0, 4)));
  // Minimum evidence gates are transparent working rules, not calibrated confidence.
  const model = seasonal.length >= 8 && seasonalYears.size >= 2 ? "seasonal" : matchingWeekdays.length >= 4 ? "weekday"
    : eligible.length >= 8 ? "service" : "insufficient";
  const samples = model === "seasonal" ? seasonal : model === "weekday" ? matchingWeekdays : eligible;
  if (!entry.saleItemId || model === "insufficient") return { ...base, quantity: null,
    observations: samples.length, model: "insufficient", observedMin: null, observedMax: null, deviation: null };
  const average = samples.reduce((n, s) => n + s.quantity, 0) / samples.length;
  return { ...base, model, quantity: round(average), observations: samples.length,
    observedMin: Math.min(...samples.map(s => s.quantity)), observedMax: Math.max(...samples.map(s => s.quantity)),
    deviation: round(Math.sqrt(samples.reduce((n, s) => n + (s.quantity - average) ** 2, 0) / samples.length)) };
}
export function projectMenuIngredients(entries: MenuEntry[], items: ForecastItem[]) {
  const ingredients = new Map<string, ForecastIngredient>();
  const blockers: string[] = [];
  for (const item of items) {
    const entry = entries.find(e => e.id === item.entryId);
    if (!entry?.available || item.quantity === null) continue;
    for (const component of entry.components) for (const ingredient of component.ingredients) {
      const quantity = round(item.quantity * component.portions * ingredient.quantity / component.yieldPortions);
      const row = ingredients.get(ingredient.productId);
      if (row && row.unit !== ingredient.unit) { blockers.push(`${ingredient.productName} : unités incompatibles dans la carte.`); continue; }
      const next = row ?? { productId: ingredient.productId, productName: ingredient.productName, unit: ingredient.unit, quantity: 0, sources: [] };
      next.quantity = round(next.quantity + quantity);
      next.sources.push({ saleItemName: entry.name, recipeName: component.recipeName, recipeVersion: component.recipeVersion, quantity });
      ingredients.set(ingredient.productId, next);
    }
  }
  return { ingredients: [...ingredients.values()], blockers };
}
