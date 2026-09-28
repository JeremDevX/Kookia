import type { WeatherProvider } from "../../integrations/weatherProvider.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { getServiceWeather } from "./serviceWeatherService.js";

// Refresh only during explicit forecast reads, never within decision transactions.
export async function refreshForecastWeather(restaurantId: string, date: string, provider: WeatherProvider) {
  if (!provider.configured) return;
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { hasTerrace: true, mode: true } });
  if (restaurant.hasTerrace !== null && restaurant.mode === "operational") await getServiceWeather(restaurantId, date, "lunch", provider);
}
