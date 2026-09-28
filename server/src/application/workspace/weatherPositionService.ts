import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma.js";
import { weatherPositionSchema, type ConfirmWeatherPosition, type WeatherLocationState } from "../../../../shared/serviceWeather.js";
import type { WeatherProvider } from "../../integrations/weatherProvider.js";
import { WorkspaceError } from "./catalogService.js";
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
    status: !position ? "unconfirmed" : position.invalidated || position.addressFingerprint !== addressFingerprint ? "needs_review" : "confirmed" };
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
    const data = { place, precision: "city" as const, confirmedAt: new Date().toISOString(), confirmedBy: actorId,
      addressFingerprint: current.addressFingerprint, invalidated: false, provenance: provider.provenance };
    await tx.workspaceDocument.upsert({ where: weatherKey(restaurantId, positionKind),
      create: { restaurantId, kind: positionKind, revision: 1, data: weatherJson(data) },
      update: { data: weatherJson(data), revision: { increment: 1 } } });
    await tx.workspaceDocument.deleteMany({ where: { restaurantId, kind: cacheKind } });
    return getWeatherLocation(restaurantId, provider.configured, tx);
  });
}

export async function invalidateWeatherLocation(db: WeatherDatabase, restaurantId: string) {
  const document = await db.workspaceDocument.findUnique({ where: weatherKey(restaurantId, positionKind) });
  const position = weatherPositionSchema.safeParse(document?.data);
  if (document && position.success) await db.workspaceDocument.update({ where: weatherKey(restaurantId, positionKind),
    data: { data: weatherJson({ ...position.data, invalidated: true }), revision: { increment: 1 } } });
  await db.workspaceDocument.deleteMany({ where: { restaurantId, kind: cacheKind } });
}
