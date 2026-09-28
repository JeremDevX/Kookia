import { roundOrderQuantity } from "../../shared/orderQuantity";
import { ingredientById, ingredients, quantity, suppliers } from "./catalog";
import { draw, forecastPortions, isOpen, menuFor, offsetDate, purchasePrice, serviceNames, weekday } from "./calendar";
import { serviceForecast } from "./forecast";
import { available, grossDosages } from "./inventory";
import type { Day, Lot, Options, Purchase } from "./model";

export function nextDelivery(date: string, supplierId: string) {
  const supplier = suppliers.find(s => s.id === supplierId)!;
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = offsetDate(date, offset);
    if ((supplier.deliveryDays as readonly number[]).includes(weekday(candidate))) return candidate;
  }
  throw new Error("Calendrier fournisseur vide.");
}
// No actual service demand, incident, or future waste enters this planning function.
export function forecastNeeds(from: string, until: string, options: Options) {
  const needs: Record<string, number> = {};
  for (let date = from; date < until; date = offsetDate(date, 1)) {
    if (!isOpen(date, options)) continue;
    for (const service of serviceNames(options)) for (const recipe of menuFor(date, service, options)) {
      const { planned } = forecastPortions(recipe, serviceForecast(date, service, options).forecastCovers, options);
      for (const [id, dosage] of Object.entries(grossDosages(recipe, options.lossPercent))) {
        needs[id] = quantity((needs[id] ?? 0) + quantity(dosage * planned / 10));
      }
    }
  }
  return needs;
}
export function planPurchase(placedOn: string, deliveryOn: string, supplierId: string, lots: Lot[], purchases: Purchase[], options: Options, opening = false) {
  const needs = forecastNeeds(deliveryOn, nextDelivery(deliveryOn, supplierId), options);
  const lines = ingredients.filter(p => p.supplier === supplierId && needs[p.id] > 0).flatMap(product => {
    const usable = available(lots.filter(l => l.expiresOn >= deliveryOn), product.id);
    const incoming = purchases.filter(p => !p.receivedOn && p.deliveryOn <= deliveryOn)
      .reduce((sum, p) => sum + (p.lines.find(l => l.productId === product.id)?.ordered ?? 0), 0);
    const ordered = roundOrderQuantity(Math.max(0, needs[product.id] + product.threshold - usable - incoming), product.packSize);
    return ordered ? [{ productId: product.id, ordered, received: 0, shortage: 0, unitPrice: purchasePrice(product, placedOn) }] : [];
  });
  if (!lines.length) return;
  purchases.push({ id: `BC-${placedOn}-${options.seed}-${supplierId}`, supplierId, placedOn, expectedOn: deliveryOn, deliveryOn,
    receivedOn: null, invoiceOn: null, delayed: false,
    time: `${String(7 + Math.floor(draw(options.seed, `${deliveryOn}:${supplierId}:hour`) * 3)).padStart(2, "0")}:${String(Math.floor(draw(options.seed, `${deliveryOn}:${supplierId}:minute`) * 12) * 5).padStart(2, "0")}`,
    lines, note: opening ? "Livraison de mise en route convenue avant le début du dossier." : "Commande de clôture sur besoins prévus jusqu'à la prochaine tournée, après déduction du stock utilisable." });
}
export function bootstrapPurchases(options: Options, purchases: Purchase[]) {
  let first = options.start;
  while (!isOpen(first, options)) first = offsetDate(first, 1);
  for (const supplier of suppliers) planPurchase(offsetDate(options.start, -1), first, supplier.id, [], purchases, options, true);
}
export function planTomorrow(date: string, lots: Lot[], purchases: Purchase[], options: Options) {
  const tomorrow = offsetDate(date, 1);
  for (const supplier of suppliers) {
    if (!(supplier.deliveryDays as readonly number[]).includes(weekday(tomorrow))) continue;
    if (purchases.some(p => p.supplierId === supplier.id && !p.receivedOn)) continue;
    planPurchase(date, tomorrow, supplier.id, lots, purchases, options);
  }
}
export function receivePurchases(purchases: Purchase[], lots: Lot[], day: Day, options: Options) {
  const due = purchases.filter(p => !p.receivedOn && p.deliveryOn === day.date);
  const target = due[Math.floor(draw(options.seed, `${day.date}:supplier-incident`) * due.length)];
  if (!target && ["short_delivery", "unavailable", "late_delivery"].includes(day.incident)) {
    day.events.push("Incident fournisseur sans effet ce jour : aucune livraison prévue.");
  }
  for (const purchase of due) {
    if (purchase === target && day.incident === "late_delivery" && !purchase.delayed) {
      purchase.deliveryOn = offsetDate(day.date, 1); purchase.delayed = true;
      day.events.push(`${purchase.supplierId} : tournée reportée au ${purchase.deliveryOn}. Aucun crédit de stock avant réception.`);
      continue;
    }
    purchase.receivedOn = day.date; purchase.invoiceOn = offsetDate(day.date, 1);
    const affected = Math.floor(draw(options.seed, `${day.date}:missing-product`) * purchase.lines.length);
    for (const [index, line] of purchase.lines.entries()) {
      if (purchase === target && index === affected && ["short_delivery", "unavailable"].includes(day.incident)) {
        line.shortage = day.incident === "unavailable" ? line.ordered : quantity(line.ordered * (.4 + draw(options.seed, `${day.date}:missing-amount`) * .45));
        day.events.push(`${ingredientById(line.productId).name} : ${line.shortage} ${ingredientById(line.productId).unit} non livrés. La cuisine doit composer avec le disponible.`);
      }
      line.received = quantity(line.ordered - line.shortage);
      const product = ingredientById(line.productId), stock = day.stock.find(s => s.id === product.id)!;
      stock.received = quantity(stock.received + line.received); stock.shortage = quantity(stock.shortage + line.shortage);
      if (line.received) lots.push({ id: `LOT-${purchase.id}-${product.id}`, productId: product.id, receivedOn: day.date,
        expiresOn: offsetDate(day.date, product.shelfLife - 1), quantity: line.received, unitCost: line.unitPrice });
    }
  }
}
