import type { WorkshopForecast } from "../../shared/workshopForecast";
import { isOpen, offsetDate, salePrice, serviceNames } from "./calendar";
import { ingredientById, ingredients, suppliers } from "./catalog";
import { toMilliUnits } from "./dailyStock";
import { planService } from "./forecast";
import type { Checkpoint, Options, ServiceName } from "./model";
import { forecastNeeds, planTomorrow } from "./purchasing";
import { scenarioWeather } from "./weather";

function forecastHours(slot: ServiceName, covers: number) {
  const start = slot === "lunch" ? 12 : 19;
  // Weight the first, middle and last hour 2:3:1, rounding cumulative totals.
  const cumulative = [0, 2, 5, 6].map(weight => Math.round(weight * covers / 6));
  return cumulative.slice(1).map((total, index) => ({
    hour: start + index,
    covers: total - cumulative[index],
  }));
}

export function dailyForecast(date: string, checkpoint: Checkpoint, profile: Options, connected = false): WorkshopForecast {
  const weather = scenarioWeather(date, profile);
  const slots = isOpen(date, profile) ? serviceNames(profile) : [];
  let covers = 0;
  let revenueCents = 0;
  const hours = slots.flatMap(slot => {
    const { forecastCovers, menu } = planService(date, slot, profile, weather.percent);
    covers += forecastCovers;
    revenueCents += menu.reduce((sum, item) => sum + item.forecast * salePrice(item.recipe, date), 0);
    return forecastHours(slot, forecastCovers);
  });

  const summary = { provenance: "demo_simulation" as const, date, basedOnDate: checkpoint.asOf, covers, revenueCents, hours };
  if (connected) {
    const purchaseNeeds = Array.from({ length: 21 }, (_, index) => {
      const day = offsetDate(date, index);
      const needs = forecastNeeds(day, offsetDate(day, 1), profile);
      return { date: day, products: ingredients.filter(product => needs[product.id] > 0).map(product => ({
        name: product.name.normalize("NFC"), unit: product.unit, quantityMilli: toMilliUnits(needs[product.id]),
        supplier: suppliers.find(supplier => supplier.id === product.supplier)!.name.normalize("NFC"),
      })) };
    });
    return { ...summary, products: [], purchaseNeeds };
  }

  const purchases = structuredClone(checkpoint.pendingOrders);
  planTomorrow(date, checkpoint.lots, purchases, profile);
  const products = purchases.slice(checkpoint.pendingOrders.length).flatMap(purchase => {
    const supplier = suppliers.find(item => item.id === purchase.supplierId)!;
    return purchase.lines.map(line => {
      const product = ingredientById(line.productId);
      return {
        name: product.name.normalize("NFC"),
        supplier: supplier.name.normalize("NFC"),
        unit: product.unit,
        quantityMilli: toMilliUnits(line.ordered),
        deliveryDate: purchase.deliveryOn,
      };
    });
  });
  return { ...summary, products };
}
