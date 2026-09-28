import { createHash } from "node:crypto";
import type { ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { WeatherDatabase } from "./weatherStorage.js";
import type { WeatherSchedule } from "./weatherPolicy.js";

export async function getWeatherSchedule(db: WeatherDatabase, restaurantId: string, date: string, slot: ServiceSlot): Promise<WeatherSchedule> {
  const [weekly, session] = await Promise.all([
    db.restaurantServiceSchedule.findUnique({ where: { restaurantId_weekday_slot: { restaurantId, weekday: new Date(date).getUTCDay(), slot } } }),
    db.restaurantServiceSession.findUnique({ where: { restaurantId_serviceDate_slot: { restaurantId, serviceDate: new Date(`${date}T00:00:00Z`), slot } } }),
  ]);
  return { plannedOpen: session?.plannedOpen ?? Boolean(weekly), opensAt: weekly?.opensAt ?? null, closesAt: weekly?.closesAt ?? null,
    key: createHash("sha256").update(JSON.stringify([weekly?.revision, weekly?.opensAt, weekly?.closesAt,
      session?.revision, session?.updatedAt, session?.plannedOpen])).digest("hex") };
}
