import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import { env } from "../../config/env.js";
import * as forecastPolicy from "./operationalForecastPolicy.js";
import { getOperationalForecast, getOperationalForecasts } from "./operationalForecastService.js";
import { getPurchaseSuggestions } from "./purchaseSuggestionService.js";
import { weatherHours } from "./weatherPolicy.js";
import * as weatherPosition from "./weatherPositionService.js";
import * as weatherStorage from "./weatherStorage.js";

const today = "2026-11-03";
const asOfDate = "2026-11-02";
const currentTime = new Date(`${today}T08:00:00Z`);
const updatedAt = new Date("2026-11-02T10:00:00Z");
const date = (day: string) => new Date(`${day}T00:00:00Z`);
const tomorrow = "2026-11-04";
const longHorizon = "2026-11-05";
const saleItemId = "dish";
const originalWeatherMode = env.OPEN_METEO_MODE;
// Keys produced by the previous per-horizon calculation for this fixture.
const creamSuggestionKey = "70716b3d9ed775f0d6c8f757bc92a5b1899f2c26e637140e158f12e0b48f68c0";
const flourSuggestionKey = "e8c4e943dd2ba5533d927a68eff3d89f61a2097866f93251c552587ba1658f8b";

function menuEntry(index: number, ingredients: MenuEntry["components"][number]["ingredients"]): MenuEntry {
  return { id: `dish-${index}`, name: "Plat du jour", saleItemId, category: "Plat", available: true, priceCents: 900,
    components: [{ recipeId: "recipe", recipeVersionId: `recipe-${index}`, recipeVersion: index, recipeName: "Tourte",
      category: "Plat", portions: 1, yieldPortions: 3, ingredients }] };
}

function fixture() {
  const history = Array.from({ length: 8 }, (_, index) => date(`2026-10-${24 + index}`));
  const sessions = history.map(serviceDate => ({ serviceDate, slot: "lunch", plannedOpen: true, coverage: "complete", updatedAt }));
  const sales = history.map(serviceDate => ({ serviceDate, updatedAt, saleItemId, source: "manual", quantity: 1, revision: 1,
    serviceAllocation: { updatedAt, saleRevision: 1, lunchQuantity: 1, dinnerQuantity: 0 } }));
  const flour = { productId: "flour", productName: "Farine", quantity: 1, unit: "kg" };
  const cream = { productId: "cream", productName: "Crème", quantity: 1, unit: "kg" };
  const menus = [
    { id: "today", revision: 1, serviceDate: date(today), slot: "lunch", entries: [menuEntry(1, [flour, cream])] },
    { id: "tomorrow", revision: 1, serviceDate: date(tomorrow), slot: "lunch", entries: [menuEntry(2, [flour, cream])] },
    { id: "last", revision: 1, serviceDate: date(longHorizon), slot: "lunch", entries: [menuEntry(3, [{ ...cream, unit: "L" }])] },
  ];
  const products = [cream, flour].map(({ productId: id, productName: name, unit }, index) => ({
    id, name, unit, supplierId: `supplier-${id}`, stockRevision: 1, pricePerUnit: 1, orderPackQuantity: 1,
    supplier: { name, leadTimeDays: 0, orderCutoffTime: "23:59", deliveryWeekdays: index === 0 ? [3, 5] : [0, 1, 2, 3, 4, 5, 6] },
  }));
  return {
    restaurant: {
      findUnique: vi.fn().mockResolvedValue({ mode: "operational", openingWeekdays: null }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ mode: "operational", hasTerrace: true }),
    },
    restaurantServiceSchedule: { findMany: vi.fn().mockResolvedValue([2, 3, 4].map(weekday => ({ weekday, slot: "lunch" }))) },
    dailySale: { findMany: vi.fn().mockResolvedValue(sales) },
    restaurantServiceSession: { findMany: vi.fn().mockResolvedValue(sessions) },
    serviceMenuVersion: { findMany: vi.fn(({ where }: { where: { serviceDate: { lte: Date } } }) =>
      menus.filter(menu => menu.serviceDate <= where.serviceDate.lte)) },
    serviceDay: { count: vi.fn().mockResolvedValue(8) },
    product: { findMany: vi.fn().mockResolvedValue(products) },
    $queryRaw: vi.fn().mockResolvedValue(products.map(({ id, unit }) => ({
      productId: id, countDate: date(asOfDate), unit, stockRevisionAfter: 1, countedQuantity: id === "cream" ? 0.283 : 0,
    }))),
    purchaseOrderLine: { findMany: vi.fn().mockResolvedValue(products.map(({ id, unit }) => ({
      productId: id, unit, quantity: 0.1, order: { status: "validated" }, receiptLines: [], expectedDeliveryDate: date(tomorrow),
    }))) },
    stockLot: { findMany: vi.fn().mockResolvedValue([]) },
    recommendationDecision: { findMany: vi.fn().mockResolvedValue([{
      decision: "purchase_suggestion_excluded", operationId: "excluded-cream", purchaseOrderLine: null,
      snapshot: { productId: "cream", suggestionKey: creamSuggestionKey },
    }]) },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(currentTime);
  env.OPEN_METEO_MODE = "evaluation";
  const place = { id: 1, name: "Paris", region: "Île-de-France", country: "France", latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" };
  const fetchedAt = `${today}T07:30:00Z`;
  vi.spyOn(weatherPosition, "getWeatherLocation").mockResolvedValue({
    configured: true, city: place.name, addressFingerprint: "address", status: "confirmed", revision: 1,
    position: { place, revision: 1, confirmedAt: fetchedAt, confirmedBy: "owner", precision: "city",
      addressFingerprint: "address", invalidated: false, provenance: "live" },
  });
  vi.spyOn(weatherStorage, "readWeatherCache").mockResolvedValue({
    id: "8f506976-a909-4e45-8724-1de08447794a", positionRevision: 1, lastSuccessAt: fetchedAt, retryAt: null, failed: false, provenance: "live",
    forecast: { fetchedAt, issuedAt: null, timezone: "Europe/Paris", days: [{ date: today, weatherCode: 63 }],
      hours: weatherHours(today, "00:00", "24:00").map(time => ({ time, temperature: 12, precipitation: 1, precipitationProbability: 90, windSpeed: 5 })) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  env.OPEN_METEO_MODE = originalWeatherMode;
});

it("reads and calculates forecast inputs once for distinct supplier horizons", async () => {
  const db = fixture();
  const database = db as unknown as NonNullable<Parameters<typeof getPurchaseSuggestions>[1]>;
  const project = vi.spyOn(forecastPolicy, "forecastMenuEntry");
  const result = await getPurchaseSuggestions("restaurant", database, currentTime);

  expect(db.restaurant.findUniqueOrThrow).toHaveBeenCalledTimes(1);
  expect(db.restaurantServiceSchedule.findMany).toHaveBeenCalledTimes(1);
  expect(weatherPosition.getWeatherLocation).toHaveBeenCalledTimes(1);
  expect(weatherStorage.readWeatherCache).toHaveBeenCalledTimes(1);
  expect(db.dailySale.findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    where: { restaurantId: "restaurant", serviceDate: { gte: date("2023-11-03"), lte: date(asOfDate) } },
  }));
  for (const findMany of [db.restaurantServiceSession.findMany, db.serviceMenuVersion.findMany]) {
    expect(findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { restaurantId: "restaurant", serviceDate: { gte: date("2023-11-03"), lte: date(longHorizon) } },
    }));
  }
  expect(project.mock.calls.map(([, serviceDate]) => serviceDate)).toEqual([today, tomorrow, longHorizon]);
  expect(result.blockers).toEqual([`${longHorizon} midi : Crème : unité modifiée entre services.`]);
  expect(result.suggestions).toMatchObject([
    { productId: "cream", suggestionKey: creamSuggestionKey, canAdd: false, status: "ready", forecastNeed: 0.616, expectedQuantity: 0.1,
      conditionalNetNeed: 0.233, deliveryHorizon: { throughDate: longHorizon },
      sources: [{ recipeVersion: 1, quantity: 0.283 }, { recipeVersion: 2, quantity: 0.333 }],
      weatherAdjustments: [{ date: today, adjustment: { percent: -15 } }, { date: tomorrow, adjustment: { percent: 0 } }, { date: longHorizon }],
      decision: { kind: "excluded", operationId: "excluded-cream", orderId: null, quantity: null } },
    { productId: "flour", suggestionKey: flourSuggestionKey, canAdd: true, status: "ready", forecastNeed: 0.283, expectedQuantity: 0,
      conditionalNetNeed: 0.283, deliveryHorizon: { throughDate: today },
      sources: [{ recipeVersion: 1, quantity: 0.283 }], weatherAdjustments: [{ date: today, adjustment: { percent: -15 } }] },
  ]);
});

it("keeps the same service forecast when a later horizon adds an incompatible unit", async () => {
  const database = fixture() as unknown as NonNullable<Parameters<typeof getOperationalForecast>[3]>;
  const forecasts = await getOperationalForecasts("restaurant", today, [longHorizon, today], database, asOfDate);
  const short = forecasts.get(today)!;
  const long = forecasts.get(longHorizon)!;

  expect(short).toEqual(await getOperationalForecast("restaurant", today, today, database, asOfDate));
  expect(short.services).toEqual(long.services.slice(0, 2));
  expect(short.services[0].forecastKey).toBe("17a81101d383ebd7acb3157646dfed788ce59c491a826ebc04def140fc0fcdb9");
  expect(long.services[4].forecastKey).toBe("593702e8786ae29a2ee3b157b232a9ca779532f2146b508e7fa2a73cbfc01a7b");
  expect(short.ingredientNeeds.map(({ productId, quantity }) => [productId, quantity])).toEqual([["flour", 0.283], ["cream", 0.283]]);
  expect(long.ingredientNeeds.map(({ productId, quantity }) => [productId, quantity])).toEqual([["flour", 0.616], ["cream", 0.616]]);
  expect(short.blockers).toEqual([]);
  expect(long.blockers).toEqual([`${longHorizon} midi : Crème : unité modifiée entre services.`]);
});

it("validates the requested range before loading history", async () => {
  const db = fixture();
  const database = db as unknown as Parameters<typeof getOperationalForecasts>[3];
  await expect(getOperationalForecasts("restaurant", today, [], database, asOfDate)).resolves.toEqual(new Map());
  await expect(getOperationalForecasts("restaurant", today, [today, "2027-02-02"], database, asOfDate))
    .rejects.toMatchObject({ code: "INVALID_FORECAST_RANGE" });
  expect(db.dailySale.findMany).not.toHaveBeenCalled();
});
