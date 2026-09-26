import { z } from "zod";
import { ingredients, quantity, recipes } from "./catalog";

export const optionsSchema = z.object({
  name: z.string().trim().min(1).max(80), address: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80), email: z.email().max(120),
  start: z.iso.date(), days: z.number().int().min(1).max(90),
  covers: z.number().int().min(5).max(200), seed: z.number().int().min(1).max(999999),
  variationPercent: z.number().int().min(0).max(50),
  lossPercent: z.number().min(0).max(20),
  starterPercent: z.number().int().min(20).max(100),
  dessertPercent: z.number().int().min(20).max(100),
  incidentEvery: z.number().int().min(1).max(90),
  incident: z.enum(["normal", "short_delivery", "high_waste", "refund", "stock_gap"]),
}).strict();
export type Options = z.infer<typeof optionsSchema>;
export interface StockLine {
  id: string; opening: number; ordered: number; received: number; shortage: number;
  consumed: number; loss: number; adjustment: number; closing: number;
}
export interface Day {
  date: string; incident: Options["incident"]; covers: number; sales: number[]; stock: StockLine[];
  gross: number; refunded: number; collected: number; net: number; tax: number; card: number; cash: number;
}
export interface Scenario { options: Options; days: Day[] }
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function displayDate(date: string) {
  if (!z.iso.date().safeParse(date).success) return "Date invalide";
  const parsed = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}
export function offsetDate(date: string, offset: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}
export function generateScenario(input: Options): Scenario {
  const parsed = optionsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Vérifiez les champs du dossier : dates valides, durée de 1 à 90 jours, couverts de 5 à 200 et réglages dans les limites indiquées. L’identité doit être renseignée avec un email valide.");
  const options = parsed.data;
  if (!z.iso.date().safeParse(offsetDate(options.start, options.days - 1)).success) throw new Error("La fin de période doit rester une date valide (année sur quatre chiffres).");
  let state = options.seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const days: Day[] = [];
  for (let index = 0; index < options.days; index++) {
    const amplitude = options.variationPercent / 100;
    const covers = Math.max(5, Math.round(options.covers * (1 + (random() * 2 - 1) * amplitude)));
    const sales = [Math.round(covers * options.starterPercent / 100), covers, Math.round(covers * options.dessertPercent / 100)];
    const incident = (index + 1) % options.incidentEvery === 0 ? options.incident : "normal";
    const stock = ingredients.map((ingredient, productIndex) => {
      const consumed = quantity(recipes.reduce((sum, recipe, recipeIndex) => {
        const dosage = Object.entries(recipe.ingredients).find(([id]) => id === ingredient.id)?.[1] ?? 0;
        return sum + dosage * sales[recipeIndex] / 10;
      }, 0));
      const opening = days.at(-1)?.stock[productIndex].closing ?? 0;
      const loss = quantity(consumed * (incident === "high_waste" ? options.lossPercent / 100 + 0.1 : options.lossPercent / 100));
      const received = quantity(consumed + loss + (index === 0 ? ingredient.threshold : 0));
      const shortage = incident === "short_delivery" && productIndex === 0 ? 0.5 : 0;
      const adjustment = incident === "stock_gap" && productIndex === 0 ? 0.25 : 0;
      return { id: ingredient.id, opening, consumed, loss, received, shortage, adjustment,
        ordered: quantity(received + shortage), closing: quantity(opening + received - consumed - loss + adjustment) };
    });
    const gross = sales.reduce((total, sold, i) => total + sold * recipes[i].price, 0);
    const refunded = incident === "refund" ? recipes.reduce((sum, recipe) => sum + recipe.price, 0) : 0;
    const collected = gross - refunded;
    const net = Math.round(collected / 1.1);
    const card = Math.round(gross * 0.78) - refunded;
    days.push({ date: offsetDate(options.start, index), incident, covers, sales, stock, gross, refunded, collected, net, tax: collected - net, card, cash: collected - card });
  }
  return { options, days };
}
