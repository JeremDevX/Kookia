import { ingredientById, recipeById, suppliers } from "./catalog";
import { toMilliUnits } from "./dailyStock";
import type { Purchase, Scenario } from "./model";
import { purchaseReferences } from "./purchasing";

function dailyPurchase(purchase: Purchase, date: string) {
  const supplier = suppliers.find(item => item.id === purchase.supplierId)!;
  const received = purchase.receivedOn === date;
  const { deliveryReference, invoiceReference } = purchaseReferences(purchase.id);
  return {
    reference: purchase.id,
    ...(purchase.approvedOrderId && { approvedOrderId: purchase.approvedOrderId }),
    supplier: supplier.name.normalize("NFC"),
    orderedOn: purchase.placedOn,
    expectedOn: purchase.expectedOn,
    receipt: received ? { deliveryReference, invoiceReference, invoiceOn: purchase.invoiceOn! } : null,
    lines: purchase.lines.map(line => {
      const product = ingredientById(line.productId);
      return {
        name: product.name.normalize("NFC"),
        ...(line.approvedLineId && { approvedLineId: line.approvedLineId }),
        unit: product.unit,
        orderedMilli: toMilliUnits(line.ordered),
        receivedMilli: received ? toMilliUnits(line.received) : 0,
        unitPriceCents: line.unitPrice,
      };
    }),
  };
}

export function dailyOperations(scenario: Scenario) {
  const day = scenario.days[0];
  const purchases = scenario.purchases
    .filter(purchase => purchase.receivedOn === day.date || (!purchase.approvedOrderId && purchase.placedOn === day.date))
    .map(purchase => dailyPurchase(purchase, day.date));
  const services = day.services.map(service => ({
    slot: service.name,
    covers: service.transactions.reduce((sum, transaction) => sum + transaction.covers, 0),
    items: service.runs.map(run => {
      const recipe = recipeById(run.recipeId);
      return {
        name: recipe.name.normalize("NFC"),
        category: recipe.category,
        priceCents: run.price,
        prepTime: recipe.prepTime,
        planned: run.planned,
        prepared: run.prepared,
        sold: run.sold,
        refused: run.unserved,
      };
    }),
  }));
  const losses = day.waste.map(waste => {
    const kind = waste.kind === "expiry" || waste.kind === "spoilage" ? "raw" : waste.kind;
    const unit = waste.unit === "portions" ? "portion" : waste.unit;
    const product = waste.productId ? ingredientById(waste.productId) : undefined;
    return {
      kind,
      slot: waste.service ?? null,
      recipe: waste.recipeId ? recipeById(waste.recipeId).name.normalize("NFC") : null,
      product: product?.name.normalize("NFC") ?? null,
      ...(product && { supplier: suppliers.find(supplier => supplier.id === product.supplier)!.name.normalize("NFC") }),
      lotReference: waste.lotId ?? null,
      quantityMilli: toMilliUnits(waste.quantity),
      unit,
      avoidable: waste.avoidable,
      note: waste.note,
    };
  });
  return { purchases, services, losses, incident: day.incident, events: day.events };
}
