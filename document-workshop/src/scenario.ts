import { z } from "zod";
import { CATALOG_VERSION, ingredients, quantity, recipes } from "./catalog";
import { isOpen, offsetDate, draw, serviceNames } from "./calendar";
import { continuationStart, validateCheckpoint } from "./continuation";
import { available, countAdjustment, expireLots, spoilLot } from "./inventory";
import { optionsSchema } from "./model";
import type { Checkpoint, Day, Incident, Options, OptionsInput, Scenario } from "./model";
import { bootstrapPurchases, planTomorrow, receivePurchases } from "./purchasing";
import { runService } from "./service";
import { refundTransaction } from "./till";
import { scenarioWeather } from "./weather";

export { localToday, displayDate, offsetDate } from "./calendar";
export { optionsSchema } from "./model";
export type { Options, Scenario, Day, StockLine } from "./model";
const incidents: Incident[] = ["short_delivery", "late_delivery", "unavailable", "high_waste", "refund", "stock_gap", "demand_shift"];
function incidentOn(date: string, origin: string, options: Options): Incident {
  const index = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${origin}T12:00:00Z`)) / 86400000);
  if (!isOpen(date, options) || (index + 1) % options.incidentEvery !== 0) return "normal";
  return options.incident === "mixed" ? incidents[Math.floor(draw(options.seed, `${date}:incident`) * incidents.length)] : options.incident;
}
function openingDay(date: string, opening: Checkpoint["lots"], incident: Incident, options: Options): Day {
  return { date, open: isOpen(date, options), incident, events: [], baselineCovers: 0, forecastCovers: 0, covers: 0, weather: scenarioWeather(date, options),
    services: [], waste: [], closingLots: [], stock: ingredients.map(p => ({ id: p.id, opening: available(opening, p.id), ordered: 0,
      received: 0, shortage: 0, consumed: 0, loss: 0, adjustment: 0, closing: 0 })),
    gross: 0, discount: 0, refunded: 0, collected: 0, net: 0, tax: 0, card: 0, cash: 0 };
}
export function generateScenario(input: OptionsInput, continuation?: Checkpoint): Scenario {
  const parsed = optionsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Vérifiez les champs : durée de 1 à 90 jours, 5 à 200 couverts de référence, au moins un jour ouvert et réglages dans les limites indiquées.");
  const options = parsed.data;
  // Future lot expiries and the next supplier cycle must also fit the date representation.
  if (![offsetDate(options.start, -1), offsetDate(options.start, options.days + 100)].every(d => z.iso.date().safeParse(d).success)) throw new Error("La période et les échéances des lots doivent rester des dates valides sur quatre chiffres.");
  const opening = continuation ? validateCheckpoint(continuation) : null;
  if (opening && continuationStart(opening) !== options.start) throw new Error(`La reprise doit commencer le ${continuationStart(opening)}, juste après la clôture du dossier précédent.`);
  const lots = structuredClone(opening?.lots ?? []), purchases = structuredClone(opening?.pendingOrders ?? []);
  const origin = opening?.originStart ?? options.start;
  if (!opening) bootstrapPurchases(options, purchases);
  const days: Day[] = [];
  for (let index = 0; index < options.days; index++) {
    const date = offsetDate(options.start, index);
    const day = openingDay(date, lots, incidentOn(date, origin, options), options);
    expireLots(lots, day);
    receivePurchases(purchases, lots, day, options);
    if (day.incident === "high_waste") spoilLot(lots, day, options);
    if (day.open) {
      for (const name of serviceNames(options)) day.services.push(runService(day, name, lots, options));
      day.baselineCovers = day.services.reduce((sum, s) => sum + s.baselineCovers, 0);
      day.forecastCovers = day.services.reduce((sum, s) => sum + s.forecastCovers, 0);
      day.covers = day.services.reduce((sum, s) => sum + s.covers, 0);
      const transactions = day.services.flatMap(s => s.transactions);
      if (day.incident === "refund") refundTransaction(transactions, date, options);
      if (day.incident === "demand_shift") day.events.push(`Fréquentation inattendue : ${day.covers} couverts demandés pour ${day.forecastCovers} prévus ; achats inchangés.`);
      for (const transaction of transactions) {
        day.gross += transaction.gross; day.discount += transaction.discount; day.refunded += transaction.refund;
        day.collected += transaction.total - transaction.refund;
        day.net += transaction.net - transaction.refundNet;
        day.tax += transaction.tax - (transaction.refund - transaction.refundNet);
        day[transaction.payment] += transaction.total - transaction.refund;
      }
    }
    if (day.incident === "stock_gap") countAdjustment(lots, day, options);
    // Ordering happens at closure, using today's available balance and future forecasts only.
    planTomorrow(date, lots, purchases, options);
    for (const stock of day.stock) {
      stock.ordered = quantity(purchases.filter(p => p.placedOn === date).reduce((sum, p) => sum + (p.lines.find(l => l.productId === stock.id)?.ordered ?? 0), 0));
      stock.closing = available(lots, stock.id);
    }
    day.closingLots = structuredClone(lots.filter(l => l.quantity > 0));
    days.push(day);
    for (let i = lots.length - 1; i >= 0; i--) if (!lots[i].quantity) lots.splice(i, 1);
  }
  return { version: 2, options, days, purchases, opening,
    catalog: { version: CATALOG_VERSION, ingredients: structuredClone(ingredients), recipes: structuredClone(recipes) },
    checkpoint: { version: 2, catalogVersion: CATALOG_VERSION, asOf: days.at(-1)!.date, originStart: origin, seed: options.seed,
      dossier: `${options.start}-${options.seed}`, lots: structuredClone(lots), pendingOrders: structuredClone(purchases.filter(p => !p.receivedOn)) } };
}
