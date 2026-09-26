import { recipeById } from "./catalog";
import { draw, salePrice } from "./calendar";
import type { Options, ServiceName, Transaction, TransactionLine } from "./model";

export function buildTransactions(customers: string[][], date: string, service: ServiceName, options: Options): Transaction[] {
  const transactions: Transaction[] = [];
  let cursor = 0;
  while (cursor < customers.length) {
    const start = cursor;
    const count = Math.min(customers.length - cursor, 1 + Math.floor(draw(options.seed, `${date}:${service}:${cursor}:party`) * 5));
    const lines: TransactionLine[] = [];
    for (const dishes of customers.slice(cursor, cursor + count)) {
      const hasMain = dishes.some(id => recipeById(id).category === "Plat");
      const discounted = options.mealDeals && service === "lunch" && hasMain
        ? dishes.find(id => ["Entrée", "Dessert"].includes(recipeById(id).category)) : undefined;
      for (const recipeId of dishes) {
        const unitDiscount = recipeId === discounted ? 200 : 0;
        let line = lines.find(l => l.recipeId === recipeId && l.unitDiscount === unitDiscount);
        if (!line) {
          line = { recipeId, quantity: 0, unitPrice: salePrice(recipeById(recipeId), date), unitDiscount, discount: 0, total: 0 };
          lines.push(line);
        }
        line.quantity++; line.discount += unitDiscount;
        line.total = line.quantity * line.unitPrice - line.discount;
      }
    }
    cursor += count;
    if (!lines.length) continue;
    const gross = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const discount = lines.reduce((sum, l) => sum + l.discount, 0), total = gross - discount;
    const net = Math.round(total / 1.1);
    const minute = (service === "lunch" ? 12 * 60 + 20 : 19 * 60 + 20) + Math.floor(start / Math.max(1, customers.length) * 120);
    transactions.push({ id: `T-${date}-${options.seed}-${service}-${start + 1}`, service,
      table: 1 + Math.floor(draw(options.seed, `${date}:${service}:${start}:table`) * 18),
      time: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      covers: count, payment: draw(options.seed, `${date}:${service}:${start}:payment`) < .76 ? "card" : "cash",
      invoiceRequested: draw(options.seed, `${date}:${service}:${start}:invoice`) < .13,
      lines, gross, discount, total, net, tax: total - net, refund: 0, refundNet: 0 });
  }
  return transactions;
}
export function refundTransaction(transactions: Transaction[], date: string, options: Options) {
  if (!transactions.length) return;
  const target = transactions[Math.floor(draw(options.seed, `${date}:refund-receipt`) * transactions.length)];
  const line = target.lines[Math.floor(draw(options.seed, `${date}:refund-line`) * target.lines.length)];
  // One actual served item, its allocated discount, and the original payment method.
  target.refund = Math.round(line.total / line.quantity);
  target.refundNet = target.net - Math.round((target.total - target.refund) / 1.1);
  target.refundRecipeId = line.recipeId;
  target.refundReason = "Geste commercial sur un article servi ; aucune réintégration en stock.";
  target.invoiceRequested = true;
}
