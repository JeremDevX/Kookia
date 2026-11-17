import { expectedCovers, menuFor } from "./calendar";
import type { Recipe } from "./catalog";
import type { Options, ServiceName } from "./model";

function forecastPortions(recipe: Recipe, covers: number, options: Options) {
  const share = recipe.category === "Entrée" ? options.starterPercent / 100 : recipe.category === "Dessert" ? options.dessertPercent / 100
    : recipe.category === "Boisson" ? .55 : recipe.id.startsWith("poulet") ? .6 : .4;
  const forecast = Math.round(covers * share);
  return { forecast, planned: Math.ceil(forecast / recipe.batch) * recipe.batch };
}

export function planService(date: string, name: ServiceName, options: Options, weatherPercent: number) {
  const baselineCovers = expectedCovers(date, name, options);
  const forecastCovers = Math.round(baselineCovers * (1 + weatherPercent / 100));
  const menu = menuFor(date, name, options).map(recipe => ({ recipe, ...forecastPortions(recipe, forecastCovers, options) }));
  return { baselineCovers, forecastCovers, menu };
}
