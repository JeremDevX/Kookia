import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { weatherForecastSchema } from "../../../../shared/serviceWeather.js";

export type WeatherDatabase = PrismaClient | Prisma.TransactionClient;
export const positionKind = "weather-position";
export const cacheKind = "weather-cache";
export const weatherCacheSchema = z.object({
  id: z.uuid(), positionRevision: z.number().int(),
  forecast: weatherForecastSchema.nullable(), provenance: z.enum(["live", "fixture"]),
  lastSuccessAt: z.iso.datetime().nullable(), retryAt: z.iso.datetime().nullable(), failed: z.boolean(),
}).strict();
export type WeatherCache = z.infer<typeof weatherCacheSchema>;
export const weatherKey = (restaurantId: string, kind: string) => ({ restaurantId_kind: { restaurantId, kind } });
export async function lockWeatherWorkspace(db: Prisma.TransactionClient, restaurantId: string) {
  await db.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
}
export async function readWeatherCache(db: WeatherDatabase, restaurantId: string): Promise<WeatherCache | null> {
  const document = await db.workspaceDocument.findUnique({ where: weatherKey(restaurantId, cacheKind) });
  const parsed = weatherCacheSchema.safeParse(document?.data);
  // A corrupt/obsolete technical cache is disposable, never a source of business facts.
  return parsed.success ? parsed.data : null;
}
export const weatherJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
