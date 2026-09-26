import { ingredientById, quantity } from "./catalog";
import type { Recipe } from "./catalog";
import { draw, offsetDate } from "./calendar";
import type { Day, Lot, Options, ServiceName } from "./model";

export const available = (lots: Lot[], productId: string) => quantity(lots.filter(l => l.productId === productId).reduce((sum, l) => sum + l.quantity, 0));
export function grossDosages(recipe: Recipe, lossPercent: number): Record<string, number> {
  return Object.fromEntries(Object.entries(recipe.ingredients).map(([id, net]) => {
    const product = ingredientById(id);
    // 10 g/mL per ten portions => exact 1 g/mL per portion at Kookia's precision.
    return [id, Math.round((net / product.yield + net * lossPercent / 100 * product.sensitivity) * 100) / 100];
  }));
}
/** FEFO, with reception/id as deterministic tie-breakers. Callers record why stock leaves. */
export function take(lots: Lot[], productId: string, amount: number) {
  if (amount < 0 || amount > available(lots, productId) + .00001) throw new Error(`Stock insuffisant : ${ingredientById(productId).name}.`);
  let remaining = quantity(amount);
  const used: { lotId: string; quantity: number }[] = [];
  const sorted = lots.filter(l => l.productId === productId && l.quantity > 0)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.receivedOn.localeCompare(b.receivedOn) || a.id.localeCompare(b.id));
  for (const lot of sorted) {
    const removed = Math.min(lot.quantity, remaining);
    if (!removed) break;
    lot.quantity = quantity(lot.quantity - removed);
    remaining = quantity(remaining - removed);
    used.push({ lotId: lot.id, quantity: removed });
  }
  return used;
}
export function expireLots(lots: Lot[], day: Day) {
  for (const lot of lots) if (lot.quantity && lot.expiresOn < day.date) {
    const product = ingredientById(lot.productId);
    day.stock.find(s => s.id === lot.productId)!.loss = quantity(day.stock.find(s => s.id === lot.productId)!.loss + lot.quantity);
    day.waste.push({ kind: "expiry", productId: lot.productId, lotId: lot.id, quantity: lot.quantity, unit: product.unit,
      avoidable: true, stockEffect: true, note: `Échéance de travail ${lot.expiresOn} dépassée ; lot écarté avant service.` });
    lot.quantity = 0;
  }
}
export function spoilLot(lots: Lot[], day: Day, options: Options) {
  const eligible = lots.filter(l => l.quantity > 0 && ingredientById(l.productId).shelfLife <= 10);
  const lot = eligible[Math.floor(draw(options.seed, `${day.date}:spoiled-lot`) * eligible.length)];
  if (!lot) { day.events.push("Altération : aucun lot frais disponible à écarter."); return; }
  const product = ingredientById(lot.productId);
  const amount = quantity(lot.quantity * (.35 + draw(options.seed, `${day.date}:spoiled-amount`) * .5));
  lot.quantity = quantity(lot.quantity - amount);
  const line = day.stock.find(s => s.id === lot.productId)!;
  line.loss = quantity(line.loss + amount);
  day.waste.push({ kind: "spoilage", productId: lot.productId, lotId: lot.id, quantity: amount, unit: product.unit,
    avoidable: true, stockEffect: true, note: "Altération constatée à l'ouverture du lot ; matière indisponible pour la production." });
  day.events.push(`${product.name} : ${amount} ${product.unit} écartés après réception, sans achat anticipant cet incident.`);
}
export function prepare(lots: Lot[], recipe: Recipe, requested: number, options: Options, day: Day, service: ServiceName) {
  const dosages = grossDosages(recipe, options.lossPercent);
  const needs = (portions: number) => Object.entries(dosages).map(([id, dose]) => ({ id, amount: quantity(dose * portions / 10) }));
  let portions = Math.min(requested, ...Object.entries(dosages).map(([id, dose]) => Math.floor((available(lots, id) + .00049) * 10 / dose)));
  while (portions > 0 && needs(portions).some(n => n.amount > available(lots, n.id))) portions--;
  for (const { id, amount } of needs(portions)) {
    take(lots, id, amount);
    const line = day.stock.find(s => s.id === id)!;
    line.consumed = quantity(line.consumed + amount);
    const product = ingredientById(id), net = quantity(recipe.ingredients[id] * portions / 10);
    const trim = quantity(Math.max(0, amount - net));
    const nonEdible = quantity(Math.min(trim, recipe.ingredients[id] * (1 / product.yield - 1) * portions / 10 * product.nonEdibleShare));
    for (const [wasted, avoidable] of [[nonEdible, false], [quantity(trim - nonEdible), true]] as const) if (wasted > 0) {
      day.waste.push({ kind: "preparation", productId: id, recipeId: recipe.id, service, quantity: wasted, unit: product.unit,
        avoidable, stockEffect: false, note: avoidable ? "Tri et sur-parage : inclus dans le dosage brut de production." : "Fraction non comestible des parures, déjà incluse dans le dosage brut." });
    }
  }
  return portions;
}
export function countAdjustment(lots: Lot[], day: Day, options: Options) {
  const eligible = lots.filter(l => l.quantity > .01);
  const lot = eligible[Math.floor(draw(options.seed, `${day.date}:count-product`) * eligible.length)];
  if (!lot) { day.events.push("Comptage : aucun produit disponible pour constater un écart."); return; }
  const product = ingredientById(lot.productId);
  const magnitude = quantity(Math.min(lot.quantity * .15, .1 + draw(options.seed, `${day.date}:count-size`) * .6));
  const delta = draw(options.seed, `${day.date}:count-sign`) < .5 ? -magnitude : magnitude;
  if (delta < 0) take(lots, lot.productId, -delta);
  else lots.push({ ...lot, id: `count-${day.date}-${options.seed}-${lot.productId}`, quantity: delta,
    receivedOn: day.date, expiresOn: lot.expiresOn || offsetDate(day.date, 1) });
  day.stock.find(s => s.id === lot.productId)!.adjustment = delta;
  day.events.push(`Comptage ${product.name} : ${delta > 0 ? "+" : ""}${delta} ${product.unit}. Régulariser une fois, par ajustement OU comptage.`);
}
