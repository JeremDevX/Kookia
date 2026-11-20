import { roundOrderQuantity } from "../../shared/orderQuantity";
import { workshopApprovedPurchaseReference, type WorkshopApprovedLine } from "../../shared/workshopOrders";
import { ingredientById, ingredients, quantity, supplierOrderTerms, suppliers } from "./catalog";
import { draw, isOpen, offsetDate, purchasePrice, serviceNames, weekday } from "./calendar";
import { planService } from "./forecast";
import { available, grossDosages } from "./inventory";
import type { Day, Lot, Options, Purchase } from "./model";
import { scenarioWeather } from "./weather";

function nextDelivery(date: string, supplierId: string) {
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
    const weather = scenarioWeather(date, options);
    for (const service of serviceNames(options)) {
      const { menu } = planService(date, service, options, weather.percent);
      for (const { recipe, planned } of menu) {
        for (const [id, dosage] of Object.entries(grossDosages(recipe, options.lossPercent))) {
          needs[id] = quantity((needs[id] ?? 0) + quantity(dosage * planned / 10));
        }
      }
    }
  }
  return needs;
}
function deliveryTime(date: string, supplierId: string, seed: number) {
  const hour = 7 + Math.floor(draw(seed, `${date}:${supplierId}:hour`) * 3);
  const minute = Math.floor(draw(seed, `${date}:${supplierId}:minute`) * 12) * 5;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function approvedPurchase(line: WorkshopApprovedLine, date: string, options: Options): Purchase {
  const supplier = suppliers.find(supplier => supplier.name === line.supplier);
  const product = ingredients.find(product => product.name === line.name && product.unit === line.unit && product.supplier === supplier?.id);
  if (!supplier || !product) throw new Error(`Le produit validé « ${line.name} » ne correspond pas au catalogue de l’atelier.`);
  return {
    id: workshopApprovedPurchaseReference(date, line.lineId),
    approvedOrderId: line.orderId,
    supplierId: supplier.id,
    placedOn: line.orderedOn,
    expectedOn: line.dueOn,
    deliveryOn: date,
    receivedOn: null,
    invoiceOn: null,
    delayed: date > line.dueOn,
    time: deliveryTime(date, supplier.id, options.seed),
    lines: [{ productId: product.id, approvedLineId: line.lineId, ordered: line.quantityMilli / 1000,
      received: 0, shortage: 0, unitPrice: line.unitPriceCents }],
    note: "Commande validée dans Kookia. Réception simulée par l’atelier.",
  };
}

function planPurchase(placedOn: string, deliveryOn: string, supplierId: string, lots: Lot[], purchases: Purchase[], options: Options, opening = false) {
  const needs = forecastNeeds(deliveryOn, nextDelivery(deliveryOn, supplierId), options);
  const usableLots = lots.filter(l => l.expiresOn >= deliveryOn);
  const pendingDeliveries = purchases.filter(p => !p.receivedOn && p.deliveryOn <= deliveryOn);
  const lines = ingredients.filter(p => p.supplier === supplierId && needs[p.id] > 0).flatMap(product => {
    const usable = available(usableLots, product.id);
    const incoming = pendingDeliveries
      .reduce((sum, p) => sum + (p.lines.find(l => l.productId === product.id)?.ordered ?? 0), 0);
    const ordered = roundOrderQuantity(Math.max(0, needs[product.id] + product.threshold - usable - incoming), product.packSize);
    return ordered ? [{ productId: product.id, ordered, received: 0, shortage: 0, unitPrice: purchasePrice(product, placedOn) }] : [];
  });
  if (!lines.length) return;
  purchases.push({ id: `BC-${placedOn}-${options.seed}-${supplierId}`, supplierId, placedOn, expectedOn: deliveryOn, deliveryOn,
    receivedOn: null, invoiceOn: null, delayed: false,
    time: deliveryTime(deliveryOn, supplierId, options.seed),
    lines, note: opening ? "Livraison de mise en route convenue avant le début du dossier." : "Commande de clôture sur besoins prévus jusqu'à la prochaine tournée, après déduction du stock utilisable." });
}
export function bootstrapPurchases(options: Options, purchases: Purchase[]) {
  let first = options.start;
  while (!isOpen(first, options)) first = offsetDate(first, 1);
  for (const supplier of suppliers) planPurchase(offsetDate(options.start, -1), first, supplier.id, [], purchases, options, true);
}
export function planTomorrow(date: string, lots: Lot[], purchases: Purchase[], options: Options) {
  const tomorrow = offsetDate(date, supplierOrderTerms.leadTimeDays);
  for (const supplier of suppliers) {
    if (!(supplier.deliveryDays as readonly number[]).includes(weekday(tomorrow))) continue;
    if (purchases.some(p => p.supplierId === supplier.id && !p.receivedOn)) continue;
    planPurchase(date, tomorrow, supplier.id, lots, purchases, options);
  }
}
export function purchaseReferences(orderReference: string) {
  const suffix = orderReference.slice(3);
  return { suffix, deliveryReference: `BL-${suffix}`, invoiceReference: `FA-${suffix}` };
}

export function receivedLot(purchaseId: string, line: Purchase["lines"][number], receivedOn: string): Lot {
  return {
    id: line.approvedLineId ? `LOT-${purchaseId}` : `LOT-${purchaseId}-${line.productId}`, productId: line.productId, receivedOn,
    expiresOn: offsetDate(receivedOn, ingredientById(line.productId).shelfLife - 1),
    quantity: line.received, unitCost: line.unitPrice,
  };
}
export function receivePurchases(purchases: Purchase[], lots: Lot[], day: Day, options: Options, connected: boolean) {
  const due = purchases.filter(p => !p.receivedOn && p.deliveryOn === day.date);
  const target = due[Math.floor(draw(options.seed, `${day.date}:supplier-incident`) * due.length)];
  if (!target && ["short_delivery", "unavailable", "late_delivery"].includes(day.incident)) {
    day.events.push("Incident fournisseur sans effet ce jour : aucune livraison prévue.");
  }
  for (const purchase of due) {
    if (purchase === target && day.incident === "late_delivery" && !purchase.delayed) {
      purchase.deliveryOn = offsetDate(day.date, 1); purchase.delayed = true;
      const supplier = connected ? suppliers.find(supplier => supplier.id === purchase.supplierId)!.name : purchase.supplierId;
      day.events.push(`${supplier} : tournée reportée au ${purchase.deliveryOn}. Aucun crédit de stock avant réception.`);
      continue;
    }
    purchase.receivedOn = day.date; purchase.invoiceOn = offsetDate(day.date, 1);
    const affected = Math.floor(draw(options.seed, `${day.date}:missing-product`) * purchase.lines.length);
    for (const [index, line] of purchase.lines.entries()) {
      const product = ingredientById(line.productId);
      if (purchase === target && index === affected && ["short_delivery", "unavailable"].includes(day.incident)) {
        const drawAmount = draw(options.seed, `${day.date}:missing-amount`);
        const partial = line.ordered * (connected ? .1 + drawAmount * .1 : .4 + drawAmount * .45);
        line.shortage = day.incident === "unavailable" ? line.ordered : product.unit === "pcs" ? Math.floor(partial) : quantity(partial);
        if (line.shortage > 0) day.events.push(`${product.name} : ${line.shortage} ${product.unit} non livrés. La cuisine doit composer avec le disponible.`);
      }
      line.received = quantity(line.ordered - line.shortage);
      const stock = day.stock.find(s => s.id === product.id)!;
      stock.received = quantity(stock.received + line.received); stock.shortage = quantity(stock.shortage + line.shortage);
      if (line.received) lots.push(receivedLot(purchase.id, line, day.date));
    }
  }
}
