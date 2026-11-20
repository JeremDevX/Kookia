import { z } from "zod";
import { recipes } from "./catalog";
import type { Ingredient, Recipe } from "./catalog";
import type { Options, ServiceName } from "./model";

const isoDate = z.iso.date();
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export function displayDate(date: string) {
  if (!isoDate.safeParse(date).success) return "Date invalide";
  return dateFormat.format(new Date(`${date}T12:00:00Z`));
}
export { addCalendarDays as offsetDate } from "../../shared/calendarDate";
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const isOpen = (date: string, options: Options) => !options.closedWeekdays.includes(weekday(date));
// Independent keyed draws: adding a payment or waste draw never changes demand.
export function draw(seed: number, key: string) {
  let hash = seed ^ 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}
export const serviceTimes = {
  lunch: { startHour: 12, prepareAt: "10:30" },
  dinner: { startHour: 19, prepareAt: "18:00" },
} as const;
export const serviceNames = (options: Options): ServiceName[] => options.services === "both" ? ["lunch", "dinner"] : [options.services];
export function expectedCovers(date: string, service: ServiceName, options: Options) {
  if (!isOpen(date, options)) return 0;
  // Calendar factors reuse restaurantSimulationDemand's principles, without fixed dates.
  const day = weekday(date), month = Number(date.slice(5, 7));
  const weekly = day === 5 || day === 6 ? 1.28 : day === 0 ? 1.12 : .9;
  const seasonal = month >= 5 && month <= 8 ? 1.14 : month <= 2 || month >= 11 ? .82 : 1;
  const share = options.services === "both" ? (service === "lunch" ? .6 : .4) : 1;
  return Math.max(1, Math.round(options.covers * weekly * seasonal * share));
}
export function menuFor(date: string, service: ServiceName, options: Options): Recipe[] {
  const eligible = recipes.filter(r => !r.months || r.months.includes(Number(date.slice(5, 7))));
  const choose = (category: Recipe["category"], suffix: string) => {
    const pool = eligible.filter(r => r.category === category);
    return pool[Math.floor(draw(options.seed, `${date}:${service}:${suffix}`) * pool.length)];
  };
  const meat = eligible.find(r => r.id.startsWith("poulet"))!;
  const veg = eligible.filter(r => r.category === "Plat" && r.id !== meat.id);
  return [choose("Entrée", "starter"), meat, veg[Math.floor(draw(options.seed, `${date}:${service}:main`) * veg.length)], choose("Dessert", "dessert"),
    ...(options.drinks ? [recipes.find(r => r.id === "expresso")!] : [])];
}
export const purchasePrice = (product: Ingredient, date: string) => Math.round(product.price * (1 + (draw(17, `${date.slice(0, 7)}:${product.id}`) - .5) * .22));
export const salePrice = (recipe: Recipe, date: string) => recipe.category === "Boisson" ? recipe.price
  : recipe.price + Math.floor((Number(date.slice(5, 7)) - 1) / 3) * 50;
