import { randomUUID } from "node:crypto";
import request from "supertest";
import { vi } from "vitest";
import { createApp } from "./app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import type { WeatherForecast, WeatherPlace, WeatherLocationState, ServiceWeather } from "../../../shared/serviceWeather.js";
import type { WeatherProvider } from "../integrations/weatherProvider.js";

export const weatherDate = "2026-09-28";
export const weatherPlace: WeatherPlace = { id: 2988507, name: "Paris", region: "Île-de-France", country: "France",
  latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" };
export function weatherForecast(): WeatherForecast {
  return { days: Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.parse(weatherDate) + i * 86400000).toISOString().slice(0, 10), weatherCode: 63 })),
    timezone: "Europe/Paris", fetchedAt: new Date().toISOString(), issuedAt: null,
    hours: Array.from({ length: 168 }, (_, i) => ({ time: new Date(Date.parse(`${weatherDate}T00:00:00Z`) - 7200000 + i * 3600000).toISOString(),
      temperature: 18, precipitation: 0, precipitationProbability: 20, windSpeed: 10 })) };
}
export function weatherProvider(provenance: "fixture" | "live" = "fixture") {
  return { configured: true as boolean, provenance, search: vi.fn(async () => [weatherPlace]),
    resolve: vi.fn(async () => weatherPlace), forecast: vi.fn(async () => weatherForecast()) } satisfies WeatherProvider;
}
export async function weatherAccount(users: string[], provider: WeatherProvider) {
  const app = createApp(undefined, undefined, provider), agent = request.agent(app);
  const result = await agent.post("/api/auth/register").send({ displayName: "Weather isolated fixture",
    email: `weather-${randomUUID()}@example.com`, password: "weather isolated fixture password" }).expect(201);
  const actorId = result.body.user.id as string; users.push(actorId);
  const catalog = (await agent.get("/api/workspace/catalog").expect(200)).body;
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { ownerId: actorId } });
  const location = async () => (await agent.get("/api/workspace/weather/location").expect(200)).body as WeatherLocationState;
  const confirm = async () => {
    const current = await location();
    return agent.post("/api/workspace/weather/location").send({ placeId: weatherPlace.id,
      expectedRevision: current.revision, addressFingerprint: current.addressFingerprint }).expect(200);
  };
  const weekly = (expectedRevision = 0, closesAt = "14:00") => agent.put("/api/workspace/services/weekly")
    .send({ weekday: 1, slot: "lunch", opensAt: "12:00", closesAt, open: true, expectedRevision }).expect(200);
  const weather = async () => (await agent.get("/api/workspace/services/weather")
    .query({ date: weatherDate, slot: "lunch" }).expect(200)).body as ServiceWeather;
  const plan = async () => {
    const recipe = (await agent.post("/api/workspace/recipes").send({ operationId: randomUUID(), name: "Weather recipe", category: "Plat",
      prepTime: 10, yieldPortions: 10, effectiveFrom: weatherDate, ingredients: [{ productId: catalog.products[0].id, quantity: 1 }] }).expect(201)).body;
    const item = (await agent.post("/api/workspace/sales/items").send({ name: "Weather menu item" }).expect(201)).body;
    await agent.post("/api/workspace/service-menu").send({ operationId: randomUUID(), expectedRevision: 0, serviceDate: weatherDate, slot: "lunch",
      note: "Isolated weather fixture", entries: [{ id: randomUUID(), name: "Weather menu item", category: "Plat", saleItemId: item.id,
        available: true, priceCents: 1200, components: [{ recipeId: recipe.id, portions: 1 }] }] }).expect(201);
    return { operationId: randomUUID(), expectedRevision: 0, serviceDate: weatherDate, slot: "lunch", action: "validate_plan",
      planned: [{ recipeId: recipe.id, portions: 10 }], outcomes: [], substitutions: [], note: "Chef review" };
  };
  return { app, agent, actorId, restaurantId: restaurant.id, location, confirm, weekly, weather, plan };
}
