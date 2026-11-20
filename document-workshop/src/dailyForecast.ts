import type { WorkshopForecast } from "../../shared/workshopForecast";
import type { WorkshopWeather } from "../../shared/workshopWeather";
import { offsetDate, salePrice, serviceNames, serviceWindow } from "./calendar";
import { ingredientById, ingredients, suppliers } from "./catalog";
import { toMilliUnits } from "./dailyStock";
import { planService } from "./forecast";
import type { Checkpoint, Options } from "./model";
import { forecastNeeds, planTomorrow } from "./purchasing";
import { liveServiceWeather, scenarioWeather } from "./weather";

function forecastHours(start: number, end: number, covers: number) {
  const first = Math.floor(start / 60);
  const count = Math.ceil(end / 60) - first;
  const weighted = start % 60 === 0 && end - start === 180;
  let allocated = 0;
  return Array.from({ length: count }, (_, index) => {
    const hour = first + index;
    const share = weighted ? [2, 5, 6][index] / 6 : (Math.min(end, (hour + 1) * 60) - start) / (end - start);
    const cumulative = Math.round(covers * share);
    const row = { hour, covers: cumulative - allocated };
    allocated = cumulative;
    return row;
  });
}

export function dailyForecast(date: string, checkpoint: Checkpoint, profile: Options,
  connected = false, weather?: WorkshopWeather, profileFor?: (date: string) => Options): WorkshopForecast {
  const scenarioPercent = weather ? 0 : scenarioWeather(date, profile).percent;
  const slots = serviceNames(date, profile);
  let covers = 0;
  let revenueCents = 0;
  const byHour = new Map<number, number>();
  const serviceWeather = weather && slots.map(slot => liveServiceWeather(date, slot, weather, profile));
  const plannedServices = slots.map((slot, index) => {
    const { baselineCovers, forecastCovers, menu } = planService(date, slot, profile, serviceWeather?.[index].percent ?? scenarioPercent);
    covers += forecastCovers;
    revenueCents += menu.reduce((sum, item) => sum + item.forecast * salePrice(item.recipe, date), 0);
    const { opensAt, closesAt, start, end } = serviceWindow(date, slot, profile);
    for (const hour of forecastHours(start, end, forecastCovers)) {
      byHour.set(hour.hour, (byHour.get(hour.hour) ?? 0) + hour.covers);
    }
    const plannedPortions = menu.reduce((sum, item) => sum + (item.recipe.category === "Boisson" ? 0 : item.planned), 0);
    return { slot, baselineCovers, forecastCovers, plannedPortions, opensAt, closesAt };
  });
  const hours = Array.from(byHour, ([hour, covers]) => ({ hour, covers })).sort((a, b) => a.hour - b.hour);

  const summary = { provenance: "demo_simulation" as const, date, basedOnDate: checkpoint.asOf, covers, revenueCents, hours,
    ...(serviceWeather && { serviceWeather }), ...(profileFor && { plannedServices }) };
  if (connected) {
    const purchaseNeeds = Array.from({ length: 21 }, (_, index) => {
      const day = offsetDate(date, index);
      const needs = forecastNeeds(day, offsetDate(day, 1), profile, weather, profileFor);
      return { date: day, products: ingredients.filter(product => needs[product.id] > 0).map(product => ({
        name: product.name.normalize("NFC"), unit: product.unit, quantityMilli: toMilliUnits(needs[product.id]),
        supplier: suppliers.find(supplier => supplier.id === product.supplier)!.name.normalize("NFC"),
      })) };
    });
    return { ...summary, products: [], purchaseNeeds };
  }

  const purchases = structuredClone(checkpoint.pendingOrders);
  planTomorrow(date, checkpoint.lots, purchases, profile, weather, profileFor);
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
