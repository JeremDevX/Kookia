import type { Prisma, PrismaClient } from "@prisma/client";
import { formatParisDate } from "../../../../shared/parisDate.js";
import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma.js";
import { qualifiedAllocation, serviceSlots } from "../../../../shared/serviceCalendar.js";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import type { ForecastIngredient, ForecastService, OperationalForecast } from "../../../../shared/operationalForecast.js";
import { forecastMenuEntry, projectMenuIngredients, type ServiceObservation } from "./operationalForecastPolicy.js";
import { WorkspaceError } from "./catalogService.js";
import { env } from "../../config/env.js";
import { getWeatherLocation } from "./weatherPositionService.js";
import { readWeatherCache } from "./weatherStorage.js";
import { projectServiceWeather } from "./weatherPolicy.js";
import { applyForecastWeather, forecastWeatherAdjustment } from "./forecastWeatherPolicy.js";
import { forecastWeatherNotice } from "../../../../shared/forecastWeather.js";

type Database = PrismaClient | Prisma.TransactionClient;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const offset = (value: string, n: number) => iso(new Date(Date.parse(value) + n * 86400000));
export async function getOperationalForecast(restaurantId: string, fromDate: string, throughDate: string,
  db: Database = prisma, asOfDate = offset(formatParisDate(), -1)): Promise<OperationalForecast> {
  return (await getOperationalForecasts(restaurantId, fromDate, [throughDate], db, asOfDate)).get(throughDate)!;
}

export async function getOperationalForecasts(restaurantId: string, fromDate: string, throughDates: readonly string[],
  db: Database, asOfDate: string): Promise<Map<string, OperationalForecast>> {
  const forecasts = new Map<string, OperationalForecast>();
  if (!throughDates.length) return forecasts;
  let lastDate = fromDate;
  for (const throughDate of throughDates) {
    if (fromDate <= asOfDate || throughDate < fromDate || Date.parse(throughDate) - Date.parse(fromDate) > 90 * 86400000)
      throw new WorkspaceError(400, "INVALID_FORECAST_RANGE", "La prévision doit suivre la date d'observation et couvrir au plus 90 jours.");
    if (throughDate > lastDate) lastDate = throughDate;
  }
  const requestedDates = new Set(throughDates);
  // Analysis window, not a limit on the restaurant's retained history.
  const since = offset(asOfDate, -1095), knownBefore = new Date();
  const [restaurant, weekly, sessions, sales, menus] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { mode: true, hasTerrace: true } }),
    db.restaurantServiceSchedule.findMany({ where: { restaurantId } }),
    db.restaurantServiceSession.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(lastDate) } } }),
    db.dailySale.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(asOfDate) } }, include: { serviceAllocation: true } }),
    db.serviceMenuVersion.findMany({ where: { restaurantId, serviceDate: { gte: date(since), lte: date(lastDate) } }, orderBy: { revision: "desc" } }),
  ]);
  const weatherEnabled = restaurant.hasTerrace !== null && restaurant.mode === "operational" && env.OPEN_METEO_MODE !== "disabled";
  const [weatherLocation, weatherCache] = weatherEnabled ? await Promise.all([
    getWeatherLocation(restaurantId, true, db), readWeatherCache(db, restaurantId),
  ]) : [null, null];
  const menusByService = new Map<string, (typeof menus)[number]>();
  for (const menu of menus) {
    const day = iso(menu.serviceDate), key = `${day}:${menu.slot}`;
    if (!menusByService.has(key) && (day > asOfDate || menu.createdAt < knownBefore)) menusByService.set(key, menu);
  }
  const salesByDate = new Map<string, Map<string, ReturnType<typeof qualifiedAllocation>>>();
  const invalidDays = new Set<string>();
  for (const sale of sales) {
    const day = iso(sale.serviceDate), allocation = sale.serviceAllocation;
    if (invalidDays.has(day)) continue;
    const qualified = sale.source !== "demo_simulation" && sale.updatedAt < knownBefore && allocation && allocation.updatedAt < knownBefore
      ? qualifiedAllocation(sale, allocation) : null;
    if (!qualified || qualified.needsReview || qualified.unallocatedQuantity > 0) { invalidDays.add(day); continue; }
    const rows = salesByDate.get(day) ?? new Map();
    rows.set(sale.saleItemId, qualified);
    salesByDate.set(day, rows);
  }
  const history = new Map<string, ServiceObservation[]>();
  const futureSessions = new Map<string, (typeof sessions)[number]>();
  const mixTotals = new Map(serviceSlots.map(slot => [slot, { covers: 0, services: 0, portions: new Map<string, number>() }]));
  let excludedServices = 0;
  for (const session of sessions) {
    const day = iso(session.serviceDate), slot = session.slot as ServiceSlot, key = `${day}:${slot}`;
    if (day > asOfDate) { futureSessions.set(key, session); continue; }
    if (restaurant.mode !== "operational" || !session.plannedOpen || session.coverage !== "complete" || session.updatedAt >= knownBefore || invalidDays.has(day)) { excludedServices++; continue; }
    const rows = salesByDate.get(day);
    const allocationKey = slot === "lunch" ? "lunchQuantity" : "dinnerQuantity";
    const entries = menusByService.get(key)?.entries as unknown as MenuEntry[] | undefined;
    const ids = new Set(entries?.filter(e => e.available && e.saleItemId).map(e => e.saleItemId!) ?? []);
    for (const [saleItemId, allocation] of rows ?? []) if (allocation[allocationKey]) ids.add(saleItemId);
    for (const saleItemId of ids) {
      const itemKey = `${slot}:${saleItemId}`;
      const observations = history.get(itemKey) ?? [];
      observations.push({ date: day, slot, saleItemId, quantity: rows?.get(saleItemId)?.[allocationKey] ?? 0 });
      history.set(itemKey, observations);
    }
    const mix = mixTotals.get(slot);
    if (mix && session.actualCovers !== null && session.actualCovers > 0 && entries) {
      mix.covers += session.actualCovers;
      mix.services++;
      for (const entry of entries) {
        const quantity = entry.saleItemId === null ? 0 : rows?.get(entry.saleItemId)?.[allocationKey] ?? 0;
        for (const component of entry.components) {
          const previous = mix.portions.get(component.category) ?? 0;
          mix.portions.set(component.category, previous + quantity * component.portions);
        }
      }
    }
  }
  const mixBySlot = new Map([...mixTotals].map(([slot, { covers, services, portions }]) => {
    const mix = services >= 4 && covers ? ["Entrée", "Plat", "Dessert", "Boisson"].map(category => ({
      category, portionsPerCover: Math.round((portions.get(category) ?? 0) / covers * 1000) / 1000,
      observedCovers: covers, services,
    })) : [];
    return [slot, mix] as const;
  }));
  const provenance = restaurant.mode === "demo" ? "demo_simulation" : "recorded_sales";
  const assumptions = ["Estimations, sans mouvement de stock ni validation de préparation.",
    "Services complets et ventes ventilées uniquement ; jours absents, ventes corrigées non revues et simulations exclus.",
    "Même jour/service : au moins 4 observations ; repli service : au moins 8. Saison : 8 observations comparables sur au moins 2 années.",
    "Dispersion observée, pas un intervalle de confiance. Aucune précision terrain revendiquée.",
    "Fenêtre d'analyse de trois ans ; l'historique conservé n'est pas limité.", forecastWeatherNotice];
  const services: ForecastService[] = [], totals = new Map<string, ForecastIngredient>(), allBlockers: string[] = [];
  for (let day = fromDate; day <= lastDate; day = offset(day, 1)) {
    for (const slot of serviceSlots) {
      const key = `${day}:${slot}`, session = futureSessions.get(key);
      const open = session?.plannedOpen ?? weekly.some(w => w.weekday === date(day).getUTCDay() && w.slot === slot);
      const menu = menusByService.get(key), entries = (menu?.entries as unknown as MenuEntry[] | undefined) ?? [];
      const blockers: string[] = [];
      if (!weekly.length && !session) blockers.push("Horaires de service non renseignés.");
      if (open && !menu) blockers.push("Carte du service non renseignée.");
      if (restaurant.mode !== "operational") blockers.push("Espace de démonstration : aucune prévision mesurée.");
      const weather = weatherLocation?.status === "confirmed" && weatherLocation.position
        ? projectServiceWeather(day, slot, weatherLocation.position, weatherCache, knownBefore) : null;
      const weatherAdjustment = forecastWeatherAdjustment(restaurant.hasTerrace, weather);
      const items = applyForecastWeather(open ? entries.filter(e => e.available).map(e =>
        forecastMenuEntry(e, day, slot, e.saleItemId === null ? [] : history.get(`${slot}:${e.saleItemId}`) ?? [])) : [], weatherAdjustment);
      for (const item of items) if (item.quantity === null) blockers.push(`${item.name} : correspondance de vente ou historique qualifié insuffisant.`);
      const projection = projectMenuIngredients(entries, items);
      blockers.push(...projection.blockers);
      for (const need of projection.ingredients) {
        const previous = totals.get(need.productId);
        if (previous && previous.unit !== need.unit) { blockers.push(`${need.productName} : unité modifiée entre services.`); continue; }
        totals.set(need.productId, previous ? { ...previous, quantity: Math.round((previous.quantity + need.quantity) * 1000) / 1000,
          sources: [...previous.sources, ...need.sources] } : need);
      }
      const forecastKey = createHash("sha256").update(JSON.stringify({ date: day, slot, menuId: menu?.id ?? null, items, blockers, weatherAdjustment })).digest("hex");
      services.push({ date: day, slot, plannedOpen: open, menuRevision: menu?.revision ?? 0, forecastKey, items, weatherAdjustment, ingredientNeeds: projection.ingredients, blockers, mix: mixBySlot.get(slot)! });
      for (const blocker of blockers) allBlockers.push(`${day} ${slot === "lunch" ? "midi" : "soir"} : ${blocker}`);
    }
    if (requestedDates.has(day)) forecasts.set(day, { fromDate, throughDate: day, asOfDate, provenance,
      services: services.slice(), ingredientNeeds: [...totals.values()], blockers: allBlockers.slice(), excludedServices, assumptions });
  }
  return forecasts;
}
