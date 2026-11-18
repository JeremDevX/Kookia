import { createHash } from "node:crypto";
import type { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { weatherPositionSchema, type ConfirmWeatherPosition, type WeatherLocationState } from "../../../../shared/serviceWeather.js";
import type { WeatherProvider } from "../../integrations/weatherProvider.js";
import { WorkspaceError } from "./workspaceError.js";
import { cacheKind, lockWeatherWorkspace, positionKind, weatherJson, weatherKey, type WeatherDatabase } from "./weatherStorage.js";

export const locationFingerprint = (restaurant: { address: string; city: string }) =>
  createHash("sha256").update(JSON.stringify([restaurant.address.trim(), restaurant.city.trim()])).digest("hex");

export async function getWeatherLocation(restaurantId: string, configured: boolean, db: WeatherDatabase = prisma): Promise<WeatherLocationState> {
  const [restaurant, document] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { address: true, city: true } }),
    db.workspaceDocument.findUnique({ where: weatherKey(restaurantId, positionKind) }),
  ]);
  const addressFingerprint = locationFingerprint(restaurant);
  const parsed = weatherPositionSchema.safeParse(document?.data);
  const position = parsed.success ? { ...parsed.data, revision: document!.revision } : null;
  return { configured, city: restaurant.city, addressFingerprint, revision: document?.revision ?? 0, position,
    status: !position ? "unconfirmed" : position.invalidated || position.addressFingerprint !== addressFingerprint ? "needs_review" :
      "matchedAt" in position ? "matched" : "confirmed" };
}

export const usableWeatherPosition = (location: WeatherLocationState) =>
  location.status === "confirmed" || location.status === "matched" ? location.position : null;

const matchingRequests = new WeakMap<WeatherProvider, Map<string, Promise<WeatherLocationState>>>();
export async function matchRestaurantWeatherLocation(restaurantId: string, current: WeatherLocationState, provider: WeatherProvider) {
  if (!provider.configured || usableWeatherPosition(current)) return current;
  let requests = matchingRequests.get(provider);
  if (!requests) { requests = new Map(); matchingRequests.set(provider, requests); }
  const key = `${restaurantId}:${current.revision}:${current.addressFingerprint}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = matchAndSave(restaurantId, current, provider);
  requests.set(key, request);
  try { return await request; } finally { requests.delete(key); }
}

const normalizedCity = (value: string) => value.normalize("NFD").toLocaleLowerCase("fr-FR")
  .replace(/\p{M}/gu, "").replace(/[^\p{L}]+/gu, " ").trim();

async function matchAndSave(restaurantId: string, current: WeatherLocationState, provider: WeatherProvider) {
  const savedCity = current.city.trim().replace(/\s+/g, " ");
  const postalCity = /^(?:(\d{5})[, -]+(.+)|(.+?)[, -]+(\d{5}))$/u.exec(savedCity);
  const city = postalCity?.[2] ?? postalCity?.[3] ?? savedCity;
  const postal = postalCity?.[1] ?? postalCity?.[4];
  if (city.length < 2 || city.length > 120 || !/^[\p{L}\p{M}]+(?:[ .’'-][\p{L}\p{M}]+)*$/u.test(city)) return current;

  const places = await provider.search(postal ?? city, "FR");
  const name = normalizedCity(city);
  const matches = new Map(places.filter(place => place.timezone === "Europe/Paris" && normalizedCity(place.name) === name)
    .map(place => [place.id, place]));
  const [place] = matches.values();
  if (!place || matches.size !== 1) return current;
  return prisma.$transaction(async tx => {
    await lockWeatherWorkspace(tx, restaurantId);
    const latest = await getWeatherLocation(restaurantId, provider.configured, tx);
    if (latest.revision !== current.revision || latest.addressFingerprint !== current.addressFingerprint) return latest;
    await savePosition(tx, restaurantId, { place, precision: "city", matchedAt: new Date().toISOString(),
      addressFingerprint: current.addressFingerprint, invalidated: false, provenance: provider.provenance });
    return getWeatherLocation(restaurantId, provider.configured, tx);
  });
}

export async function confirmWeatherLocation(restaurantId: string, actorId: string, input: ConfirmWeatherPosition, provider: WeatherProvider) {
  // Resolve the provider ID server-side; no caller-supplied coordinate is trusted.
  const place = await provider.resolve(input.placeId);
  if (place.timezone !== "Europe/Paris") throw new WorkspaceError(400, "UNSUPPORTED_WEATHER_TIMEZONE",
    "Choisissez une commune dans le fuseau Europe/Paris, utilisé par vos services.");
  return prisma.$transaction(async tx => {
    await lockWeatherWorkspace(tx, restaurantId);
    const current = await getWeatherLocation(restaurantId, provider.configured, tx);
    if (current.revision !== input.expectedRevision || current.addressFingerprint !== input.addressFingerprint)
      throw new WorkspaceError(409, "REVISION_CONFLICT", "La localisation a changé. Rechargez-la avant de confirmer.");
    await savePosition(tx, restaurantId, { place, precision: "city", confirmedAt: new Date().toISOString(), confirmedBy: actorId,
      addressFingerprint: current.addressFingerprint, invalidated: false, provenance: provider.provenance });
    return getWeatherLocation(restaurantId, provider.configured, tx);
  });
}

async function savePosition(db: WeatherDatabase, restaurantId: string, position: z.infer<typeof weatherPositionSchema>) {
  const data = weatherJson(position);
  await db.workspaceDocument.upsert({ where: weatherKey(restaurantId, positionKind),
    create: { restaurantId, kind: positionKind, revision: 1, data },
    update: { data, revision: { increment: 1 } } });
  await db.workspaceDocument.deleteMany({ where: { restaurantId, kind: cacheKind } });
}

export async function invalidateWeatherLocation(db: WeatherDatabase, restaurantId: string) {
  const document = await db.workspaceDocument.findUnique({ where: weatherKey(restaurantId, positionKind) });
  const position = weatherPositionSchema.safeParse(document?.data);
  if (document && position.success) await db.workspaceDocument.update({ where: weatherKey(restaurantId, positionKind),
    data: { data: weatherJson({ ...position.data, invalidated: true }), revision: { increment: 1 } } });
  await db.workspaceDocument.deleteMany({ where: { restaurantId, kind: cacheKind } });
}
