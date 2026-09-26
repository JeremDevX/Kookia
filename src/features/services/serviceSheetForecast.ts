import type { ForecastItem } from "../../../shared/operationalForecast";
import type { MenuEntry, SheetInput } from "../../../shared/serviceOperations";

export function forecastSheetPlan(entries: MenuEntry[], items: ForecastItem[]): SheetInput["planned"] | null {
  if (!items.length || items.some(item => item.quantity === null || !entries.some(entry => entry.id === item.entryId))) return null;
  const portions = new Map<string, number>();
  for (const item of items) {
    const entry = entries.find(entry => entry.id === item.entryId)!;
    for (const component of entry.components) portions.set(component.recipeId,
      (portions.get(component.recipeId) ?? 0) + item.quantity! * component.portions);
  }
  return [...portions.entries()].map(([recipeId, quantity]) => ({ recipeId, portions: Math.ceil(quantity) }));
}
